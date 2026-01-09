import { SDK } from '@100mslive/server-sdk';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { log } from '../utils/logger';
import { emailService } from './email-service';

// Initialize 100ms SDK
const hms = new SDK(
  process.env.HMS_ACCESS_KEY!,
  process.env.HMS_SECRET!
);

// 100ms credentials for direct JWT signing
const HMS_ACCESS_KEY = process.env.HMS_ACCESS_KEY!;
const HMS_SECRET = process.env.HMS_SECRET!;
const HMS_TEMPLATE_ID = process.env.HMS_TEMPLATE_ID; // Optional: from 100ms dashboard

// Role types for 100ms rooms
export type TelehealthRole = 'provider' | 'patient' | 'caregiver';

// Room configuration
interface CreateRoomOptions {
  patientId: string;
  providerId: string;
  organizationId: string;
  scheduledAt?: Date;
  description?: string;
}

// Token configuration
interface GenerateTokenOptions {
  roomId: string;
  participantId: string;
  participantName: string;
  role: TelehealthRole;
  metadata?: Record<string, unknown>;
}

// Session tracking (unused - using Prisma model now)
// Status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

class TelehealthService {
  /**
   * Create a new telehealth room for patient-provider consultation
   */
  async createRoom(options: CreateRoomOptions): Promise<{
    roomId: string;
    roomCode: string;
    sessionId: string;
  }> {
    const { patientId, providerId, organizationId, scheduledAt, description } = options;

    try {
      // Verify patient exists and belongs to organization
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, organizationId },
        include: { user: { select: { firstName: true, lastName: true } } },
      });

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Verify provider exists and belongs to organization
      const provider = await prisma.user.findFirst({
        where: {
          id: providerId,
          organizations: {
            some: { organizationId },
          },
        },
        select: { firstName: true, lastName: true },
      });

      if (!provider) {
        throw new Error('Provider not found');
      }

      // Generate unique room name
      const roomName = `rpm-${organizationId.slice(-6)}-${patientId.slice(-6)}-${Date.now()}`;

      // Create room using 100ms API
      const roomConfig: Record<string, unknown> = {
        name: roomName,
        description: description || `RPM Consultation - ${patient.user.firstName} ${patient.user.lastName}`,
        recording_info: {
          enabled: true, // Enable recording for compliance
        },
      };

      // Add template_id if configured (required for proper role definitions)
      if (HMS_TEMPLATE_ID) {
        roomConfig.template_id = HMS_TEMPLATE_ID;
        log.info('[TELEHEALTH] Creating room with template', { templateId: HMS_TEMPLATE_ID });
      }

      const room = await hms.rooms.create(roomConfig);

      // Generate room codes for joining
      const roomCodes = await hms.roomCodes.create(room.id);

      // Create session record in database
      const session = await prisma.telehealthSession.create({
        data: {
          roomId: room.id,
          roomCode: roomCodes[0]?.code || roomName,
          patientId,
          providerId,
          organizationId,
          status: 'SCHEDULED',
          scheduledAt: scheduledAt || new Date(),
          metadata: {
            roomName,
            patientName: `${patient.user.firstName} ${patient.user.lastName}`,
            providerName: `${provider.firstName} ${provider.lastName}`,
          },
        },
      });

      log.info('[TELEHEALTH] Room created', {
        sessionId: session.id,
        roomId: room.id,
        patientId,
        providerId,
      });

      return {
        roomId: room.id,
        roomCode: roomCodes[0]?.code || roomName,
        sessionId: session.id,
      };
    } catch (error) {
      log.error('[TELEHEALTH] Failed to create room', { error, options });
      throw error;
    }
  }

  /**
   * Generate authentication token for joining a room using direct JWT signing
   * This matches the working EHRConnect implementation
   */
  async generateToken(options: GenerateTokenOptions): Promise<string> {
    const { roomId, participantId, participantName, role } = options;

    try {
      // Map our roles to 100ms roles
      const hmsRole = this.mapToHmsRole(role);

      // Build JWT payload matching 100ms requirements
      // Reference: https://www.100ms.live/docs/server-side/v2/how-to-guides/generate-auth-token
      const payload = {
        access_key: HMS_ACCESS_KEY,
        room_id: roomId,
        user_id: participantId,
        role: hmsRole,
        type: 'app',
        version: 2,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
      };

      // Sign JWT with HS256 algorithm
      const token = jwt.sign(payload, HMS_SECRET, {
        algorithm: 'HS256',
        expiresIn: '24h',
        jwtid: uuidv4(),
      });

      // Validate JWT format (should have 3 parts separated by dots)
      if (!token || token.split('.').length !== 3) {
        log.error('[TELEHEALTH] Invalid token format after signing', { roomId });
        throw new Error('Generated token is not in valid JWT format');
      }

      log.info('[TELEHEALTH] Token generated (direct JWT)', {
        roomId,
        participantId,
        role: hmsRole,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 50) + '...',
      });

      return token;
    } catch (error) {
      log.error('[TELEHEALTH] Failed to generate token', { error, options });
      throw error;
    }
  }

  /**
   * Get join token for a session
   */
  async getJoinToken(
    sessionId: string,
    userId: string,
    userName: string,
    organizationId: string
  ): Promise<{
    token: string;
    roomId: string;
    role: TelehealthRole;
  }> {
    // Get session
    const session = await prisma.telehealthSession.findFirst({
      where: { id: sessionId, organizationId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Allow rejoin for ACTIVE sessions or recently ended sessions (within 60 mins)
    const rejoinWindowMs = 60 * 60 * 1000; // 60 minutes
    const canRejoin = session.status === 'SCHEDULED' ||
      session.status === 'ACTIVE' ||
      (session.status === 'COMPLETED' && session.endedAt &&
        (Date.now() - session.endedAt.getTime()) < rejoinWindowMs);

    if (!canRejoin) {
      throw new Error('Session has ended and rejoin window has expired');
    }

    // Determine role based on user
    let role: TelehealthRole = 'caregiver';
    if (session.providerId === userId) {
      role = 'provider';
    } else if (session.patientId === userId) {
      role = 'patient';
    }

    // Generate token
    const token = await this.generateToken({
      roomId: session.roomId,
      participantId: userId,
      participantName: userName,
      role,
    });

    // Update session status to active if first join or rejoin
    if (session.status === 'SCHEDULED' || session.status === 'COMPLETED') {
      // Re-enable room in 100ms if it was disabled
      if (session.status === 'COMPLETED') {
        try {
          await hms.rooms.enableOrDisable(session.roomId, true);
          log.info('[TELEHEALTH] Room re-enabled for rejoin', { roomId: session.roomId });
        } catch (error) {
          log.warn('[TELEHEALTH] Failed to re-enable room', { error, roomId: session.roomId });
        }
      }

      await prisma.telehealthSession.update({
        where: { id: sessionId },
        data: {
          status: 'ACTIVE',
          startedAt: session.startedAt || new Date(),
          endedAt: null, // Clear end time on rejoin
          metadata: {
            ...(session.metadata as object || {}),
            lastRejoinAt: new Date().toISOString(),
            rejoinCount: ((session.metadata as { rejoinCount?: number })?.rejoinCount || 0) + 1,
          },
        },
      });
    }

    return {
      token,
      roomId: session.roomId,
      role,
    };
  }

  /**
   * Check if a session can be rejoined
   */
  async canRejoinSession(sessionId: string, organizationId: string): Promise<{
    canRejoin: boolean;
    reason?: string;
    timeRemaining?: number;
  }> {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: sessionId, organizationId },
    });

    if (!session) {
      return { canRejoin: false, reason: 'Session not found' };
    }

    if (session.status === 'CANCELLED') {
      return { canRejoin: false, reason: 'Session was cancelled' };
    }

    if (session.status === 'SCHEDULED' || session.status === 'ACTIVE') {
      return { canRejoin: true };
    }

    // Check rejoin window for completed sessions
    const rejoinWindowMs = 60 * 60 * 1000; // 60 minutes
    if (session.status === 'COMPLETED' && session.endedAt) {
      const timeSinceEnd = Date.now() - session.endedAt.getTime();
      if (timeSinceEnd < rejoinWindowMs) {
        return {
          canRejoin: true,
          timeRemaining: Math.floor((rejoinWindowMs - timeSinceEnd) / 1000 / 60), // minutes remaining
        };
      }
      return { canRejoin: false, reason: 'Rejoin window has expired (60 minutes)' };
    }

    return { canRejoin: false, reason: 'Session status does not allow rejoin' };
  }

  /**
   * End a telehealth session
   */
  async endSession(
    sessionId: string,
    userId: string,
    organizationId: string
  ): Promise<{
    duration: number;
    billableMinutes: number;
  }> {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: sessionId, organizationId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Only provider can end session
    if (session.providerId !== userId) {
      throw new Error('Only provider can end the session');
    }

    const endedAt = new Date();
    const startedAt = session.startedAt || session.createdAt;
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
    const durationMinutes = Math.ceil(durationSeconds / 60);

    // Calculate billable 20-minute increments (for 99457/99458)
    const billableMinutes = Math.max(durationMinutes, 1);

    // Update session
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt,
        duration: durationSeconds,
        billableMinutes,
      },
    });

    // End room in 100ms
    try {
      await hms.rooms.enableOrDisable(session.roomId, false);
    } catch (error) {
      log.warn('[TELEHEALTH] Failed to disable room in 100ms', { error, roomId: session.roomId });
    }

    // Create time log for billing
    await prisma.timeLog.create({
      data: {
        patientId: session.patientId,
        organizationId,
        userId,
        type: 'INTERACTION',
        startTime: startedAt,
        endTime: endedAt,
        durationSeconds: durationSeconds,
        notes: `Telehealth consultation - Session ${sessionId}`,
      },
    });

    log.info('[TELEHEALTH] Session ended', {
      sessionId,
      duration: durationSeconds,
      billableMinutes,
    });

    return {
      duration: durationSeconds,
      billableMinutes,
    };
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string, organizationId: string) {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: sessionId, organizationId },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        provider: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return session;
  }

  /**
   * List sessions for organization
   */
  async listSessions(
    organizationId: string,
    options?: {
      patientId?: string;
      providerId?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };
    if (options?.patientId) where.patientId = options.patientId;
    if (options?.providerId) where.providerId = options.providerId;
    if (options?.status) {
      // Handle comma-separated status values (e.g., "SCHEDULED,ACTIVE")
      const statuses = options.status.split(',').map(s => s.trim());
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }

    const [sessions, total] = await Promise.all([
      prisma.telehealthSession.findMany({
        where,
        include: {
          patient: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          provider: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.telehealthSession.count({ where }),
    ]);

    return {
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Generate a secure join token for patient email links
   * This token allows patients to join without full authentication
   */
  generatePatientJoinToken(sessionId: string, patientId: string): string {
    const payload = {
      sessionId,
      patientId,
      type: 'telehealth_join',
      iat: Math.floor(Date.now() / 1000),
    };

    // Token valid for 24 hours
    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: '24h',
      jwtid: uuidv4(),
    });
  }

  /**
   * Verify patient join token from email link
   */
  verifyPatientJoinToken(token: string): { sessionId: string; patientId: string } | null {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
        sessionId: string;
        patientId: string;
        type: string;
      };

      if (decoded.type !== 'telehealth_join') {
        return null;
      }

      return {
        sessionId: decoded.sessionId,
        patientId: decoded.patientId,
      };
    } catch {
      return null;
    }
  }

  /**
   * Schedule a future telehealth session
   */
  async scheduleSession(options: CreateRoomOptions & { notifyPatient?: boolean }) {
    const result = await this.createRoom(options);

    // Send email notification to patient if requested
    if (options.notifyPatient) {
      try {
        await this.sendSessionInviteEmail(result.sessionId, options.organizationId);
        log.info('[TELEHEALTH] Patient notification sent', {
          sessionId: result.sessionId,
          patientId: options.patientId,
        });
      } catch (error) {
        log.error('[TELEHEALTH] Failed to send patient notification', {
          sessionId: result.sessionId,
          error,
        });
        // Don't fail the session creation if email fails
      }
    }

    return result;
  }

  /**
   * Send session invite email to patient
   */
  async sendSessionInviteEmail(sessionId: string, organizationId: string): Promise<boolean> {
    // Get session with patient info
    const session = await prisma.telehealthSession.findFirst({
      where: { id: sessionId, organizationId },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        provider: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!session || !session.patient?.user?.email) {
      throw new Error('Session not found or patient has no email');
    }

    // Get organization name separately
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    // Generate join token
    const joinToken = this.generatePatientJoinToken(sessionId, session.patientId);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const joinUrl = `${baseUrl}/video/join?token=${joinToken}`;

    // Format scheduled time
    const scheduledTime = session.scheduledAt.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const patientName = `${session.patient.user.firstName} ${session.patient.user.lastName}`;
    const providerName = session.provider ? `Dr. ${session.provider.firstName} ${session.provider.lastName}` : 'Your Provider';
    const orgName = organization?.name || 'NirmiteeRPM';

    // Send email
    await emailService.sendEmail({
      to: session.patient.user.email,
      subject: `Video Call Scheduled - ${orgName}`,
      html: this.getTelehealthInviteEmailHtml({
        patientName,
        providerName,
        orgName,
        scheduledTime,
        joinUrl,
        sessionId,
      }),
      text: `
Hello ${patientName},

You have a video consultation scheduled with ${providerName}.

Date & Time: ${scheduledTime}

To join the call, click this link:
${joinUrl}

This link is valid for 24 hours from the scheduled time. You can rejoin the call within 60 minutes if disconnected.

If you need to reschedule, please contact ${orgName}.

Best regards,
${orgName} Team
      `.trim(),
    }, organizationId);

    return true;
  }

  /**
   * Get HTML template for telehealth invite email
   */
  private getTelehealthInviteEmailHtml(data: {
    patientName: string;
    providerName: string;
    orgName: string;
    scheduledTime: string;
    joinUrl: string;
    sessionId: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #745EE1 0%, #8B5CF6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📹 Video Consultation Scheduled</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hello <strong>${data.patientName}</strong>,</p>

    <p>You have a video consultation scheduled with <strong>${data.providerName}</strong>.</p>

    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #745EE1;">
      <p style="margin: 0 0 10px 0;"><strong>📅 Date & Time:</strong></p>
      <p style="margin: 0; font-size: 18px; color: #745EE1;">${data.scheduledTime}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.joinUrl}" style="display: inline-block; background: linear-gradient(135deg, #745EE1 0%, #8B5CF6 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Join Video Call
      </a>
    </div>

    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>⚠️ Important:</strong><br>
        • This link is valid for 24 hours from the scheduled time<br>
        • You can rejoin within 60 minutes if disconnected<br>
        • Please use Chrome or Safari for best experience<br>
        • Ensure your camera and microphone are working
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

    <p style="font-size: 12px; color: #666;">
      If you need to reschedule, please contact ${data.orgName}.<br>
      Session ID: ${data.sessionId}
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>© ${new Date().getFullYear()} ${data.orgName}. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Cancel a scheduled session
   */
  async cancelSession(sessionId: string, userId: string, organizationId: string, reason?: string) {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: sessionId, organizationId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'SCHEDULED') {
      throw new Error('Can only cancel scheduled sessions');
    }

    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        metadata: {
          ...(session.metadata as object || {}),
          cancelledBy: userId,
          cancelReason: reason,
          cancelledAt: new Date().toISOString(),
        },
      },
    });

    log.info('[TELEHEALTH] Session cancelled', { sessionId, userId, reason });

    return { success: true };
  }

  /**
   * Map our roles to 100ms dashboard roles
   */
  private mapToHmsRole(role: TelehealthRole): string {
    // These roles should match what you create in 100ms dashboard
    const roleMap: Record<TelehealthRole, string> = {
      provider: 'host', // Full permissions
      patient: 'guest', // Can speak, video, but limited controls
      caregiver: 'guest', // Same as patient
    };
    return roleMap[role] || 'guest';
  }

  /**
   * Update clinical notes for a session
   */
  async updateSessionNotes(
    sessionId: string,
    userId: string,
    organizationId: string,
    notes: string
  ): Promise<{ notes: string; updatedAt: Date }> {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: sessionId, organizationId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Only provider can update notes
    if (session.providerId !== userId) {
      throw new Error('Only the provider can update session notes');
    }

    // Update metadata with notes
    const existingMetadata = (session.metadata as object) || {};
    const updated = await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        metadata: {
          ...existingMetadata,
          clinicalNotes: notes,
          notesUpdatedAt: new Date().toISOString(),
          notesUpdatedBy: userId,
        },
      },
    });

    log.info('[TELEHEALTH] Session notes updated', { sessionId, notesLength: notes.length });

    return {
      notes,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Get clinical notes for a session
   */
  async getSessionNotes(sessionId: string, organizationId: string): Promise<string> {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: sessionId, organizationId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const metadata = session.metadata as { clinicalNotes?: string } | null;
    return metadata?.clinicalNotes || '';
  }

  /**
   * Cleanup stale/timed out telehealth sessions
   * Called by background job to auto-end sessions that have exceeded max duration
   */
  async cleanupStaleSessions(maxDurationMinutes: number = 60): Promise<{
    cleaned: number;
    sessions: string[];
  }> {
    const maxDurationMs = maxDurationMinutes * 60 * 1000;
    const cutoffTime = new Date(Date.now() - maxDurationMs);

    // Find active sessions that started before cutoff time
    const staleSessions = await prisma.telehealthSession.findMany({
      where: {
        status: 'ACTIVE',
        startedAt: {
          lt: cutoffTime,
        },
      },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const cleanedIds: string[] = [];

    for (const session of staleSessions) {
      try {
        const endedAt = new Date();
        const startedAt = session.startedAt || session.createdAt;
        const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
        const billableMinutes = Math.ceil(durationSeconds / 60);

        // Update session status
        await prisma.telehealthSession.update({
          where: { id: session.id },
          data: {
            status: 'COMPLETED',
            endedAt,
            duration: durationSeconds,
            billableMinutes,
            metadata: {
              ...(session.metadata as object || {}),
              endReason: 'timeout',
              autoEnded: true,
            },
          },
        });

        // Try to disable room in 100ms
        try {
          await hms.rooms.enableOrDisable(session.roomId, false);
        } catch (error) {
          log.warn('[TELEHEALTH_CLEANUP] Failed to disable room', { roomId: session.roomId, error });
        }

        // Create time log for billing
        await prisma.timeLog.create({
          data: {
            patientId: session.patientId,
            organizationId: session.organizationId,
            userId: session.providerId,
            type: 'INTERACTION',
            startTime: startedAt,
            endTime: endedAt,
            durationSeconds,
            notes: `Telehealth consultation (auto-ended) - Session ${session.id}`,
          },
        });

        cleanedIds.push(session.id);
        log.info('[TELEHEALTH_CLEANUP] Session auto-ended', {
          sessionId: session.id,
          duration: durationSeconds,
          reason: 'timeout',
        });
      } catch (error) {
        log.error('[TELEHEALTH_CLEANUP] Failed to cleanup session', {
          sessionId: session.id,
          error,
        });
      }
    }

    log.info('[TELEHEALTH_CLEANUP] Cleanup completed', {
      total: staleSessions.length,
      cleaned: cleanedIds.length,
    });

    return {
      cleaned: cleanedIds.length,
      sessions: cleanedIds,
    };
  }
}

export const telehealthService = new TelehealthService();
