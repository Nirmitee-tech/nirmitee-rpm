import { Router, Request, Response, NextFunction } from 'express';
import { mfaService } from '../../services/mfa-service';
import { authenticate } from '../../middleware/auth-middleware';
import { z } from 'zod';
import { ApiError } from '../../utils/api-error';

const router = Router();

// Validation schemas
const verifyCodeSchema = z.object({
  code: z.string().min(6, 'Code must be at least 6 characters'),
});

const disableMfaSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

const regenerateBackupCodesSchema = z.object({
  code: z.string().min(6, 'Verification code is required'),
});

const enableEmailOtpSchema = z.object({
  // No additional fields needed - uses authenticated user
});

// All MFA routes require authentication
router.use(authenticate);

// GET /api/auth/mfa/status - Get MFA status
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await mfaService.getStatus(req.user!.userId);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/mfa/setup - Generate MFA secret and QR code
router.post('/setup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await mfaService.generateSetup(req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/mfa/verify-setup - Verify code and enable MFA
router.post('/verify-setup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = verifyCodeSchema.parse(req.body);
    const result = await mfaService.verifyAndEnable(req.user!.userId, data.code);
    res.json({
      message: 'MFA enabled successfully',
      backupCodes: result.backupCodes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// POST /api/auth/mfa/disable - Disable MFA
router.post('/disable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = disableMfaSchema.parse(req.body);
    await mfaService.disable(req.user!.userId, data.password);
    res.json({ message: 'MFA disabled successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// POST /api/auth/mfa/regenerate-backup-codes - Generate new backup codes
router.post('/regenerate-backup-codes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = regenerateBackupCodesSchema.parse(req.body);
    const result = await mfaService.regenerateBackupCodes(req.user!.userId, data.code);
    res.json({
      message: 'Backup codes regenerated successfully',
      backupCodes: result.backupCodes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// POST /api/auth/mfa/enable-email - Enable email OTP MFA
router.post('/enable-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await mfaService.enableEmailOtp(req.user!.userId);
    res.json({
      message: 'Email OTP MFA enabled successfully',
      backupCodes: result.backupCodes,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/mfa/send-email-otp - Send email OTP code (for login or testing)
router.post('/send-email-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await mfaService.sendEmailOtp(req.user!.userId);
    res.json({ message: 'Verification code sent to your email' });
  } catch (error) {
    next(error);
  }
});

export { router as mfaRouter };
