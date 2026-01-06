import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth-service';
import { authenticate } from '../middleware/auth-middleware';
import { z } from 'zod';
import { ApiError } from '../utils/api-error';

const router = Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  organizationName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = signupSchema.parse(req.body);
    const result = await authService.signup(data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(data.email);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(data.token, data.password);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = refreshTokenSchema.parse(req.body);
    const result = await authService.refreshToken(data.refreshToken);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.body.refreshToken;
    const result = await authService.logout(req.user!.userId, refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticate, async (req: Request, res: Response) => {
  res.json({
    userId: req.user!.userId,
    email: req.user!.email,
    organizationId: req.user!.organizationId,
  });
});

// POST /api/auth/change-password - Change password for authenticated user
router.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const result = await authService.changePassword(
      req.user!.userId,
      data.currentPassword,
      data.newPassword
    );
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(ApiError.badRequest(error.errors[0].message));
    } else {
      next(error);
    }
  }
});

export { router as authRouter };
