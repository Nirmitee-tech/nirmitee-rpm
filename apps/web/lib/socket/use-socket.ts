'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '../api';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface UseSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connect = useCallback(() => {
    const token = api.getToken();
    if (!token) {
      setConnectionError('No auth token');
      return;
    }

    if (socketRef.current?.connected) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      options.onConnect?.();
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      options.onDisconnect?.();
    });

    socketRef.current.on('connect_error', (error) => {
      setConnectionError(error.message);
      options.onError?.(error);
    });
  }, [options]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  const off = useCallback((event: string, callback?: (...args: unknown[]) => void) => {
    if (callback) {
      socketRef.current?.off(event, callback);
    } else {
      socketRef.current?.removeAllListeners(event);
    }
  }, []);

  const subscribe = useCallback((room: string) => {
    emit('subscribe', room);
  }, [emit]);

  const unsubscribe = useCallback((room: string) => {
    emit('unsubscribe', room);
  }, [emit]);

  useEffect(() => {
    if (options.autoConnect !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, options.autoConnect]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    connect,
    disconnect,
    emit,
    on,
    off,
    subscribe,
    unsubscribe,
  };
}

// Event constants matching backend
export const WS_EVENTS = {
  NOTIFICATION: 'notification',
  NOTIFICATION_READ: 'notification:read',
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
  SYSTEM_ANNOUNCEMENT: 'system:announcement',
  USER_STATUS: 'user:status',
  // Real-time vitals and alerts (Phase 4)
  VITAL_READING_NEW: 'vital:reading:new',
  VITAL_THRESHOLD_EXCEEDED: 'vital:threshold:exceeded',
  ALERT_NEW: 'alert:new',
  ALERT_CRITICAL: 'alert:critical',
  ALERT_ESCALATED: 'alert:escalated',
  PATIENT_STATUS_CHANGED: 'patient:status:changed',
  DASHBOARD_STATS_UPDATE: 'dashboard:stats:update',
} as const;
