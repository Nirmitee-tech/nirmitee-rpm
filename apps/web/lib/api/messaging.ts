import { api } from './client';

// ============================================
// TYPES
// ============================================

export type ConversationStatus = 'ACTIVE' | 'ARCHIVED' | 'CLOSED';
export type MessageType = 'TEXT' | 'ATTACHMENT' | 'SYSTEM';

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  organizationId: string;
  role: string;
  lastReadAt?: string;
  joinedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  organizationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  messageType: MessageType;
  attachments?: unknown;
  isRead: boolean;
  readAt?: string;
  sentAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  patientId: string;
  subject?: string;
  status: ConversationStatus;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  participants: ConversationParticipant[];
  lastMessage?: Message;
  unreadCount?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ConversationListResponse {
  conversations: Conversation[];
  pagination: Pagination;
}

interface MessageListResponse {
  messages: Message[];
  hasMore: boolean;
}

interface UnreadCountResponse {
  unreadCount: number;
}

interface CreateConversationData {
  patientId: string;
  subject?: string;
  initialMessage?: string;
  participantUserIds?: string[];
}

interface SendMessageData {
  content: string;
  messageType?: MessageType;
  attachments?: unknown;
}

// ============================================
// API FUNCTIONS
// ============================================

export const messagingApi = {
  // Conversations
  getConversations: async (params?: {
    patientId?: string;
    status?: ConversationStatus;
    page?: number;
    limit?: number;
  }): Promise<ConversationListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.patientId) queryParams.append('patientId', params.patientId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return api.get(`/api/v1/messages/conversations${query}`);
  },

  getConversation: async (id: string): Promise<Conversation> => {
    return api.get(`/api/v1/messages/conversations/${id}`);
  },

  createConversation: async (data: CreateConversationData): Promise<Conversation> => {
    return api.post('/api/v1/messages/conversations', data);
  },

  archiveConversation: async (id: string): Promise<Conversation> => {
    return api.put(`/api/v1/messages/conversations/${id}/archive`, {});
  },

  getPatientConversations: async (patientId: string): Promise<{ conversations: Conversation[] }> => {
    return api.get(`/api/v1/messages/patients/${patientId}/conversations`);
  },

  // Messages
  getMessages: async (
    conversationId: string,
    params?: { before?: string; limit?: number }
  ): Promise<MessageListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.before) queryParams.append('before', params.before);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return api.get(`/api/v1/messages/conversations/${conversationId}/messages${query}`);
  },

  sendMessage: async (conversationId: string, data: SendMessageData): Promise<Message> => {
    return api.post(`/api/v1/messages/conversations/${conversationId}/messages`, data);
  },

  markAsRead: async (conversationId: string): Promise<void> => {
    return api.put(`/api/v1/messages/conversations/${conversationId}/read`, {});
  },

  // Unread Count
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    return api.get('/api/v1/messages/unread-count');
  },
};
