import { Router, Request, Response } from 'express';
import { GDPRService } from '../../services/gdpr-service';
import { DataDeletionService } from '../../services/data-deletion-service';
import { ConsentService } from '../../services/consent-service';
import { authenticate } from '../../middleware/auth-middleware';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// DATA EXPORT ENDPOINTS
// ============================================

/**
 * POST /api/v1/privacy/export-request
 * Request a data export
 */
router.post('/export-request', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      format: z.enum(['JSON', 'ZIP']).optional().default('JSON'),
    });

    const { format } = schema.parse(req.body);
    const userId = req.user!.userId;

    const result = await GDPRService.requestDataExport({ userId, format });

    res.status(201).json({
      success: true,
      data: {
        requestId: result.requestId,
        message: 'Data export request created successfully',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error instanceof Error && error.message.includes('already in progress')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Error creating export request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create export request',
    });
  }
});

/**
 * GET /api/v1/privacy/export-request/:id/status
 * Check export request status
 */
router.get('/export-request/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const status = await GDPRService.getExportStatus(id, userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Export request not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Error getting export status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get export status',
    });
  }
});

/**
 * GET /api/v1/privacy/export-request/:id/download
 * Download exported data
 */
router.get('/export-request/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const filePath = await GDPRService.getDownloadPath(id, userId);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Export file not found',
      });
    }

    // Send file
    const fileName = path.basename(filePath);
    res.download(filePath, fileName);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Error downloading export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download export',
    });
  }
});

/**
 * GET /api/v1/privacy/export-requests
 * Get all export requests for current user
 */
router.get('/export-requests', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const requests = await GDPRService.getUserExportRequests(userId);

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching export requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch export requests',
    });
  }
});

// ============================================
// DATA DELETION ENDPOINTS
// ============================================

/**
 * POST /api/v1/privacy/delete-request
 * Request account deletion
 */
router.post('/delete-request', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      reason: z.string().optional(),
      gracePeriodDays: z.number().min(1).max(90).optional(),
    });

    const { reason, gracePeriodDays } = schema.parse(req.body);
    const userId = req.user!.userId;

    const result = await DataDeletionService.requestDeletion({
      userId,
      reason,
      gracePeriodDays,
    });

    res.status(201).json({
      success: true,
      data: {
        requestId: result.requestId,
        scheduledFor: result.scheduledFor,
        message: 'Account deletion requested successfully',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error instanceof Error && error.message.includes('already pending')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Error creating deletion request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create deletion request',
    });
  }
});

/**
 * POST /api/v1/privacy/delete-request/:id/cancel
 * Cancel account deletion request
 */
router.post('/delete-request/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await DataDeletionService.cancelDeletion(id, userId);

    res.json({
      success: true,
      message: 'Deletion request cancelled successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Error cancelling deletion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel deletion request',
    });
  }
});

/**
 * GET /api/v1/privacy/delete-request/status
 * Get deletion request status
 */
router.get('/delete-request/status', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const status = await DataDeletionService.getDeletionStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error getting deletion status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deletion status',
    });
  }
});

// ============================================
// CONSENT MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /api/v1/privacy/consent
 * Get user consent preferences
 */
router.get('/consent', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const preferences = await ConsentService.getConsentPreferences(userId);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Error fetching consent preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consent preferences',
    });
  }
});

/**
 * PUT /api/v1/privacy/consent
 * Update consent preferences
 */
router.put('/consent', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      essential: z.boolean().optional(),
      analytics: z.boolean().optional(),
      marketing: z.boolean().optional(),
      thirdParty: z.boolean().optional(),
    });

    const preferences = schema.parse(req.body);
    const userId = req.user!.userId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    await ConsentService.updateConsentPreferences(userId, preferences, ipAddress, userAgent);

    res.json({
      success: true,
      message: 'Consent preferences updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error updating consent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update consent preferences',
    });
  }
});

/**
 * GET /api/v1/privacy/consent/history
 * Get consent history
 */
router.get('/consent/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const history = await ConsentService.getConsentHistory(userId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching consent history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consent history',
    });
  }
});

/**
 * POST /api/v1/privacy/consent/revoke-all
 * Revoke all non-essential consents
 */
router.post('/consent/revoke-all', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    await ConsentService.revokeAllNonEssential(userId, ipAddress, userAgent);

    res.json({
      success: true,
      message: 'All non-essential consents revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking consents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke consents',
    });
  }
});

export default router;
