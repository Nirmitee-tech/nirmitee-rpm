import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { authRouter } from './routes/auth-routes';
import { mfaRouter } from './routes/mfa-routes';
import { oauthRouter } from './routes/oauth-routes';
import { userRouter } from './routes/user-routes';
import { teamRouter } from './routes/team-routes';
import { roleRouter } from './routes/role-routes';
import { organizationRouter } from './routes/organization-routes';
import { invitationRouter } from './routes/invitation-routes';
import { notificationRouter } from './routes/notification-routes';
import { auditRouter } from './routes/audit-routes';
import { dashboardRouter } from './routes/dashboard-routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { wsService } from './services/websocket-service';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Initialize WebSocket
wsService.initialize(httpServer);

// Security middleware
app.use(helmet());

// CORS - allow all localhost for development
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow all localhost/127.0.0.1 origins
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Allow configured frontend URL
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    callback(null, false);
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/auth/mfa', mfaRouter);
app.use('/api/oauth', oauthRouter);
app.use('/api/users', userRouter);
app.use('/api/teams', teamRouter);
app.use('/api/roles', roleRouter);
app.use('/api/organizations', organizationRouter);
app.use('/api/invitations', invitationRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/audit', auditRouter);
app.use('/api/dashboard', dashboardRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_, res) => {
  res.status(404).json({ error: 'Not found' });
});

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║              NirmiteeRPM API Server                   ║
║                                                       ║
║  Status: Running                                      ║
║  Port: ${PORT}                                           ║
║  Environment: ${process.env.NODE_ENV || 'development'}                          ║
║  WebSocket: Enabled                                   ║
║                                                       ║
║  Endpoints:                                           ║
║  - POST /api/auth/login                               ║
║  - POST /api/auth/signup                              ║
║  - POST /api/auth/forgot-password                     ║
║  - GET  /api/users                                    ║
║  - GET  /api/teams                                    ║
║  - GET  /api/roles                                    ║
║  - GET  /api/notifications                            ║
║  - GET  /api/audit                                    ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
