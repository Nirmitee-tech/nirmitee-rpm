import { Router, Request, Response, NextFunction } from 'express';
import { telehealthService } from '../../services/telehealth-service';
import { auditService } from '../../services/audit-service';
import { authenticate } from '../../middleware/auth-middleware';
import { log } from '../../utils/logger';
import { prisma } from '../../utils/prisma';

const router = Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * POST /api/telehealth/join-by-token
 * Join a session using email token (public route for patients)
 * This allows patients to join from email link without full authentication
 */
router.post('/join-by-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    // Verify the join token
    const tokenData = telehealthService.verifyPatientJoinToken(token);
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Get session and patient info
    const session = await prisma.telehealthSession.findFirst({
      where: { id: tokenData.sessionId },
      include: {
        patient: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Verify patient ID matches
    if (session.patientId !== tokenData.patientId) {
      return res.status(403).json({
        success: false,
        error: 'Token does not match session',
      });
    }

    // Check if session can be joined
    const canRejoin = await telehealthService.canRejoinSession(session.id, session.organizationId);
    if (!canRejoin.canRejoin) {
      return res.status(400).json({
        success: false,
        error: canRejoin.reason || 'Cannot join this session',
      });
    }

    // Get patient name and userId
    const patientName = session.patient?.user
      ? `${session.patient.user.firstName} ${session.patient.user.lastName}`
      : 'Patient';
    const patientUserId = session.patient?.user?.id || tokenData.patientId;

    // Generate join token
    const joinResult = await telehealthService.getJoinToken(
      session.id,
      patientUserId,
      patientName,
      session.organizationId
    );

    log.info('[TELEHEALTH_ROUTES] Patient joined via email token', {
      sessionId: session.id,
      patientId: tokenData.patientId,
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        token: joinResult.token,
        roomId: joinResult.roomId,
        role: joinResult.role,
        patientName,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telehealth/verify-token
 * Verify a join token and get session info (public route)
 */
router.get('/verify-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    // Verify the join token
    const tokenData = telehealthService.verifyPatientJoinToken(token as string);
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Get session info
    const session = await prisma.telehealthSession.findFirst({
      where: { id: tokenData.sessionId },
      include: {
        provider: { select: { firstName: true, lastName: true } },
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Get organization name separately
    const organization = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { name: true },
    });

    // Check if session can be joined
    const canRejoin = await telehealthService.canRejoinSession(session.id, session.organizationId);

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        status: session.status,
        scheduledAt: session.scheduledAt,
        providerName: session.provider ? `Dr. ${session.provider.firstName} ${session.provider.lastName}` : 'Provider',
        organizationName: organization?.name || 'NirmiteeRPM',
        canJoin: canRejoin.canRejoin,
        canJoinReason: canRejoin.reason,
        timeRemaining: canRejoin.timeRemaining,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// Apply authentication middleware to all routes below
router.use(authenticate);

// ============================================
// TELEHEALTH SESSION MANAGEMENT
// ============================================

/**
 * POST /api/telehealth/sessions
 * Create a new telehealth session (room)
 */
router.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { patientId, scheduledAt, description } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'patientId is required',
      });
    }

    const result = await telehealthService.createRoom({
      patientId,
      providerId: userId,
      organizationId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      description,
    });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'telehealth.session_created',
      entity: 'telehealth_session',
      entityId: result.sessionId,
      metadata: { patientId },
    });

    log.info('[TELEHEALTH_ROUTES] Session created', {
      sessionId: result.sessionId,
      patientId,
      providerId: userId,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telehealth/sessions
 * List telehealth sessions
 */
router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;
    const { patientId, providerId, status, page, limit } = req.query;

    const result = await telehealthService.listSessions(organizationId, {
      patientId: patientId as string,
      providerId: providerId as string,
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.sessions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telehealth/sessions/:sessionId
 * Get session details
 */
router.get('/sessions/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;
    const { sessionId } = req.params;

    const session = await telehealthService.getSession(sessionId, organizationId);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/telehealth/sessions/:sessionId/join
 * Get join token for a session
 */
router.post('/sessions/:sessionId/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { sessionId } = req.params;

    // Get user name for display
    const user = await import('../../utils/prisma').then(m =>
      m.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      })
    );

    const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';

    const result = await telehealthService.getJoinToken(
      sessionId,
      userId,
      userName,
      organizationId
    );

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'telehealth.session_joined',
      entity: 'telehealth_session',
      entityId: sessionId,
      metadata: { role: result.role },
    });

    log.info('[TELEHEALTH_ROUTES] User joined session', {
      sessionId,
      userId,
      role: result.role,
    });

    res.json({
      success: true,
      data: {
        token: result.token,
        roomId: result.roomId,
        role: result.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/telehealth/sessions/:sessionId/end
 * End a telehealth session
 */
router.post('/sessions/:sessionId/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { sessionId } = req.params;

    const result = await telehealthService.endSession(sessionId, userId, organizationId);

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'telehealth.session_ended',
      entity: 'telehealth_session',
      entityId: sessionId,
      metadata: { duration: result.duration, billableMinutes: result.billableMinutes },
    });

    log.info('[TELEHEALTH_ROUTES] Session ended', {
      sessionId,
      duration: result.duration,
      billableMinutes: result.billableMinutes,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/telehealth/sessions/:sessionId/cancel
 * Cancel a scheduled session
 */
router.post('/sessions/:sessionId/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { sessionId } = req.params;
    const { reason } = req.body;

    await telehealthService.cancelSession(sessionId, userId, organizationId, reason);

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'telehealth.session_cancelled',
      entity: 'telehealth_session',
      entityId: sessionId,
      metadata: { reason },
    });

    log.info('[TELEHEALTH_ROUTES] Session cancelled', { sessionId, reason });

    res.json({
      success: true,
      message: 'Session cancelled',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telehealth/my-sessions
 * Get sessions for the currently logged-in patient
 * Used by patient portal to see their pending video calls
 */
router.get('/my-sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { status } = req.query;

    // Find patient record by userId
    const { prisma } = await import('../../utils/prisma');
    const patient = await prisma.patient.findFirst({
      where: {
        userId,
        organizationId,
      },
      select: { id: true },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
    }

    // Get sessions for this patient
    const result = await telehealthService.listSessions(organizationId, {
      patientId: patient.id,
      status: status as string || 'SCHEDULED,ACTIVE', // Default to pending calls
      limit: 20,
    });

    res.json({
      success: true,
      data: result.sessions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/telehealth/quick-call
 * Create and immediately join a call with a patient
 */
router.post('/quick-call', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'patientId is required',
      });
    }

    // Create room
    const room = await telehealthService.createRoom({
      patientId,
      providerId: userId,
      organizationId,
      description: 'Quick call',
    });

    // Get user name
    const user = await import('../../utils/prisma').then(m =>
      m.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      })
    );

    const userName = user ? `${user.firstName} ${user.lastName}` : 'Provider';

    // Generate token
    const joinResult = await telehealthService.getJoinToken(
      room.sessionId,
      userId,
      userName,
      organizationId
    );

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'telehealth.quick_call_started',
      entity: 'telehealth_session',
      entityId: room.sessionId,
      metadata: { patientId },
    });

    log.info('[TELEHEALTH_ROUTES] Quick call started', {
      sessionId: room.sessionId,
      patientId,
      providerId: userId,
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: room.sessionId,
        roomId: room.roomId,
        roomCode: room.roomCode,
        token: joinResult.token,
        role: joinResult.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/telehealth/sessions/:sessionId/notes
 * Update session clinical notes (provider only)
 */
router.put('/sessions/:sessionId/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { sessionId } = req.params;
    const { notes } = req.body;

    if (typeof notes !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'notes must be a string',
      });
    }

    const result = await telehealthService.updateSessionNotes(sessionId, userId, organizationId, notes);

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'telehealth.notes_updated',
      entity: 'telehealth_session',
      entityId: sessionId,
      metadata: { notesLength: notes.length },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telehealth/sessions/:sessionId/notes
 * Get session clinical notes
 */
router.get('/sessions/:sessionId/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;
    const { sessionId } = req.params;

    const notes = await telehealthService.getSessionNotes(sessionId, organizationId);

    res.json({
      success: true,
      data: { notes },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telehealth/sessions/:sessionId/can-rejoin
 * Check if a session can be rejoined (after disconnect)
 */
router.get('/sessions/:sessionId/can-rejoin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId!;
    const { sessionId } = req.params;

    const result = await telehealthService.canRejoinSession(sessionId, organizationId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/telehealth/sessions/:sessionId/send-invite
 * Send or resend session invite email to patient
 */
router.post('/sessions/:sessionId/send-invite', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { sessionId } = req.params;

    // Verify session exists and user is the provider
    const session = await prisma.telehealthSession.findFirst({
      where: { id: sessionId, organizationId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    if (session.providerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the session provider can send invites',
      });
    }

    await telehealthService.sendSessionInviteEmail(sessionId, organizationId);

    log.info('[TELEHEALTH_ROUTES] Invite email sent', { sessionId, sentBy: userId });

    res.json({
      success: true,
      message: 'Invite email sent successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/telehealth/schedule
 * Schedule a future telehealth session with optional email notification
 */
router.post('/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const organizationId = req.user!.organizationId!;
    const { patientId, scheduledAt, description, sendEmail } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'patientId is required',
      });
    }

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'scheduledAt is required for scheduling',
      });
    }

    const result = await telehealthService.scheduleSession({
      patientId,
      providerId: userId,
      organizationId,
      scheduledAt: new Date(scheduledAt),
      description,
      notifyPatient: sendEmail !== false, // Default to true
    });

    // Audit log
    await auditService.log({
      userId,
      organizationId,
      action: 'telehealth.session_created',
      entity: 'telehealth_session',
      entityId: result.sessionId,
      metadata: { patientId, scheduledAt, emailSent: sendEmail !== false },
    });

    log.info('[TELEHEALTH_ROUTES] Session scheduled', {
      sessionId: result.sessionId,
      patientId,
      scheduledAt,
      emailSent: sendEmail !== false,
    });

    res.status(201).json({
      success: true,
      data: {
        ...result,
        emailSent: sendEmail !== false,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
