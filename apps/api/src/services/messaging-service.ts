import { prisma } from '../utils/prisma';
import { ConversationStatus, MessageType, Prisma } from '@prisma/client';
import { auditService } from './audit-service';
import { wsService, WS_EVENTS } from './websocket-service';

// ============================================
// CONVERSATIONS
// ============================================

interface CreateConversationData {
  patientId: string;
  subject?: string;
  initialMessage?: string;
  participantUserIds: string[];
}

interface ConversationFilters {
  patientId?: string;
  status?: ConversationStatus;
  page?: number;
  limit?: number;
}

async function getConversations(
  userId: string,
  organizationId: string,
  filters: ConversationFilters = {}
) {
  const { patientId, status, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  // Get conversations where user is a participant
  const participantFilter: Prisma.ConversationParticipantWhereInput = {
    userId,
    organizationId,
  };

  const participantConversationIds = await prisma.conversationParticipant.findMany({
    where: participantFilter,
    select: { conversationId: true },
  });

  const conversationIds = participantConversationIds.map((p) => p.conversationId);

  const where: Prisma.ConversationWhereInput = {
    id: { in: conversationIds },
    organizationId,
    ...(patientId && { patientId }),
    ...(status && { status }),
  };

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        patient: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        participants: {
          include: {
            // We need to get user info separately since there's no direct relation
          },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.conversation.count({ where }),
  ]);

  // Enhance with participant names and unread counts
  const enhancedConversations = await Promise.all(
    conversations.map(async (conv) => {
      const participantUserIds = conv.participants.map((p) => p.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: participantUserIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));
      const participantsWithNames = conv.participants.map((p) => ({
        ...p,
        user: userMap.get(p.userId),
      }));

      // Get unread count for current user
      const currentParticipant = conv.participants.find((p) => p.userId === userId);
      const unreadCount = currentParticipant
        ? await prisma.message.count({
            where: {
              conversationId: conv.id,
              senderId: { not: userId },
              sentAt: { gt: currentParticipant.lastReadAt || new Date(0) },
            },
          })
        : 0;

      return {
        ...conv,
        participants: participantsWithNames,
        unreadCount,
        lastMessage: conv.messages[0] || null,
      };
    })
  );

  return {
    conversations: enhancedConversations,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

async function getConversation(conversationId: string, userId: string, organizationId: string) {
  // Verify user is a participant
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId, organizationId },
  });

  if (!participant) {
    throw new Error('Conversation not found or access denied');
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: {
      patient: {
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
      participants: true,
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Get participant user info
  const participantUserIds = conversation.participants.map((p) => p.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: participantUserIds } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));
  const participantsWithNames = conversation.participants.map((p) => ({
    ...p,
    user: userMap.get(p.userId),
  }));

  return {
    ...conversation,
    participants: participantsWithNames,
  };
}

async function createConversation(
  organizationId: string,
  data: CreateConversationData,
  createdByUserId: string
) {
  // Verify patient exists
  const patient = await prisma.patient.findFirst({
    where: { id: data.patientId, organizationId, deletedAt: null },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  // Get creator info
  const creator = await prisma.user.findUnique({
    where: { id: createdByUserId },
    select: { firstName: true, lastName: true },
  });

  // Create conversation with participants
  const conversation = await prisma.conversation.create({
    data: {
      organizationId,
      patientId: data.patientId,
      subject: data.subject,
      status: 'ACTIVE',
      lastMessageAt: data.initialMessage ? new Date() : null,
      participants: {
        create: [
          // Add creator
          {
            userId: createdByUserId,
            organizationId,
            role: 'STAFF',
            lastReadAt: new Date(),
          },
          // Add patient
          {
            userId: patient.userId,
            organizationId,
            role: 'PATIENT',
          },
          // Add other participants
          ...data.participantUserIds
            .filter((id) => id !== createdByUserId && id !== patient.userId)
            .map((userId) => ({
              userId,
              organizationId,
              role: 'STAFF',
            })),
        ],
      },
      // Add initial message if provided
      ...(data.initialMessage && {
        messages: {
          create: {
            organizationId,
            senderId: createdByUserId,
            senderName: `${creator?.firstName || ''} ${creator?.lastName || ''}`.trim() || 'Staff',
            senderRole: 'STAFF',
            content: data.initialMessage,
            messageType: 'TEXT',
            sentAt: new Date(),
          },
        },
      }),
    },
    include: {
      participants: true,
      messages: true,
    },
  });

  await auditService.log({
    userId: createdByUserId,
    organizationId,
    action: 'conversation.created',
    entity: 'conversation',
    entityId: conversation.id,
    metadata: { patientId: data.patientId, subject: data.subject },
  });

  return conversation;
}

async function archiveConversation(conversationId: string, organizationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'ARCHIVED' },
  });

  await auditService.log({
    userId,
    organizationId,
    action: 'conversation.archived',
    entity: 'conversation',
    entityId: conversationId,
    metadata: { status: 'ARCHIVED' },
  });

  return updated;
}

// ============================================
// MESSAGES
// ============================================

interface SendMessageData {
  content: string;
  messageType?: MessageType;
  attachments?: unknown;
}

interface MessageFilters {
  before?: string; // cursor for pagination
  limit?: number;
}

async function getMessages(
  conversationId: string,
  userId: string,
  organizationId: string,
  filters: MessageFilters = {}
) {
  const { before, limit = 50 } = filters;

  // Verify user is a participant
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId, organizationId },
  });

  if (!participant) {
    throw new Error('Access denied');
  }

  const where: Prisma.MessageWhereInput = {
    conversationId,
    organizationId,
    ...(before && { id: { lt: before } }),
  };

  const messages = await prisma.message.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take: limit,
  });

  // Mark messages as read for this user
  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  });

  return {
    messages: messages.reverse(), // Return in chronological order
    hasMore: messages.length === limit,
  };
}

async function sendMessage(
  conversationId: string,
  userId: string,
  organizationId: string,
  data: SendMessageData
) {
  // Verify user is a participant
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId, organizationId },
  });

  if (!participant) {
    throw new Error('Access denied');
  }

  // Get sender info
  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });

  // Determine role based on whether user is patient or staff
  const patient = await prisma.patient.findFirst({
    where: { userId, organizationId },
  });

  const senderRole = patient ? 'PATIENT' : 'STAFF';

  const message = await prisma.message.create({
    data: {
      conversationId,
      organizationId,
      senderId: userId,
      senderName: `${sender?.firstName || ''} ${sender?.lastName || ''}`.trim() || 'Unknown',
      senderRole,
      content: data.content,
      messageType: data.messageType || 'TEXT',
      attachments: data.attachments as Prisma.InputJsonValue,
      sentAt: new Date(),
    },
  });

  // Update conversation's lastMessageAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Update sender's lastReadAt
  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  });

  // Emit via WebSocket to all participants
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (conversation) {
      // Emit to organization room for real-time updates
      wsService.emitToOrganization(organizationId, WS_EVENTS.ALERT_NEW, {
        type: 'NEW_MESSAGE',
        conversationId,
        message: {
          id: message.id,
          senderName: message.senderName,
          content: message.content.substring(0, 100), // Preview
          sentAt: message.sentAt,
        },
      });
    }
  } catch (error) {
    console.error('Failed to emit message notification:', error);
  }

  return message;
}

async function markAsRead(
  conversationId: string,
  userId: string,
  organizationId: string
) {
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId, organizationId },
  });

  if (!participant) {
    throw new Error('Access denied');
  }

  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  });

  // Also mark all messages as read
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
    },
    data: { isRead: true, readAt: new Date() },
  });
}

// ============================================
// UNREAD COUNT
// ============================================

async function getUnreadCount(userId: string, organizationId: string) {
  // Get all conversations where user is a participant
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId, organizationId },
    select: { conversationId: true, lastReadAt: true },
  });

  let totalUnread = 0;

  for (const p of participations) {
    const unread = await prisma.message.count({
      where: {
        conversationId: p.conversationId,
        senderId: { not: userId },
        sentAt: { gt: p.lastReadAt || new Date(0) },
      },
    });
    totalUnread += unread;
  }

  return { unreadCount: totalUnread };
}

// ============================================
// PATIENT CONVERSATIONS
// ============================================

async function getPatientConversations(patientId: string, organizationId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { patientId, organizationId },
    include: {
      participants: true,
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  // Get participant names
  const enhancedConversations = await Promise.all(
    conversations.map(async (conv) => {
      const participantUserIds = conv.participants.map((p) => p.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: participantUserIds } },
        select: { id: true, firstName: true, lastName: true },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));
      const participantsWithNames = conv.participants.map((p) => ({
        ...p,
        user: userMap.get(p.userId),
      }));

      return {
        ...conv,
        participants: participantsWithNames,
        lastMessage: conv.messages[0] || null,
      };
    })
  );

  return { conversations: enhancedConversations };
}

export const messagingService = {
  // Conversations
  getConversations,
  getConversation,
  createConversation,
  archiveConversation,
  getPatientConversations,

  // Messages
  getMessages,
  sendMessage,
  markAsRead,

  // Counts
  getUnreadCount,
};
