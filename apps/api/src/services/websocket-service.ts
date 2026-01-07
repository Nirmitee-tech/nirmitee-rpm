import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { log } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  organizationId?: string;
}

class WebSocketService {
  private io: Server | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private orgSockets: Map<string, Set<string>> = new Map(); // orgId -> Set of socketIds

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HttpServer): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const payload = verifyToken(token);
        socket.userId = payload.userId;
        socket.organizationId = payload.organizationId;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.userId!;
      const orgId = socket.organizationId!;

      log.debug('[WS] User connected', { userId, socketId: socket.id });

      // Track user socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Track org socket
      if (!this.orgSockets.has(orgId)) {
        this.orgSockets.set(orgId, new Set());
      }
      this.orgSockets.get(orgId)!.add(socket.id);

      // Join user and org rooms
      socket.join(`user:${userId}`);
      socket.join(`org:${orgId}`);

      // Handle room subscriptions
      socket.on('subscribe', (room: string) => {
        // Only allow subscribing to valid rooms
        if (room.startsWith('team:') || room.startsWith('entity:')) {
          socket.join(room);
        }
      });

      socket.on('unsubscribe', (room: string) => {
        socket.leave(room);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        log.debug('[WS] User disconnected', { userId, socketId: socket.id });

        // Clean up user socket tracking
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }

        // Clean up org socket tracking
        const orgSocketSet = this.orgSockets.get(orgId);
        if (orgSocketSet) {
          orgSocketSet.delete(socket.id);
          if (orgSocketSet.size === 0) {
            this.orgSockets.delete(orgId);
          }
        }
      });
    });

    return this.io;
  }

  /**
   * Get Socket.IO server instance
   */
  getIO(): Server {
    if (!this.io) {
      throw new Error('WebSocket server not initialized');
    }
    return this.io;
  }

  /**
   * Emit to a specific user (all their connected sockets)
   */
  emitToUser(userId: string, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit to all users in an organization
   */
  emitToOrganization(organizationId: string, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(`org:${organizationId}`).emit(event, data);
  }

  /**
   * Emit to a specific team
   */
  emitToTeam(teamId: string, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(`team:${teamId}`).emit(event, data);
  }

  /**
   * Emit to specific entity subscribers
   */
  emitToEntity(entity: string, entityId: string, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(`entity:${entity}:${entityId}`).emit(event, data);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: unknown): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  /**
   * Check if a user is currently connected
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Get count of online users in an organization
   */
  getOnlineUsersInOrg(organizationId: string): number {
    const sockets = this.orgSockets.get(organizationId);
    return sockets ? sockets.size : 0;
  }
}

export const wsService = new WebSocketService();

// Event types for type safety
export const WS_EVENTS = {
  // Notification events
  NOTIFICATION: 'notification',
  NOTIFICATION_READ: 'notification:read',

  // Data change events
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',

  TEAM_CREATED: 'team:created',
  TEAM_UPDATED: 'team:updated',
  TEAM_DELETED: 'team:deleted',
  TEAM_MEMBER_ADDED: 'team:member:added',
  TEAM_MEMBER_REMOVED: 'team:member:removed',

  ROLE_CREATED: 'role:created',
  ROLE_UPDATED: 'role:updated',
  ROLE_DELETED: 'role:deleted',

  // System events
  SYSTEM_ANNOUNCEMENT: 'system:announcement',
  USER_STATUS: 'user:status',
} as const;
