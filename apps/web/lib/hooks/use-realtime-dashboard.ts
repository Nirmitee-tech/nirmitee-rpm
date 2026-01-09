'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket, WS_EVENTS } from '../socket';

// Types for real-time data
export interface RealtimeVitalReading {
  id: string;
  patientId: string;
  patientName: string;
  vitalType: string;
  values: Record<string, number>;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  recordedAt: string;
  createdAt: string;
}

export interface RealtimeAlert {
  id: string;
  patientId: string;
  patientName: string;
  severity: 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL';
  title: string;
  message: string;
  vitalType?: string;
  status: string;
  escalationLevel: number;
  assignedToId?: string;
  createdAt: string;
}

export interface PatientStatusChange {
  patientId: string;
  patientName: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
  timestamp: string;
}

export interface DashboardStatsUpdate {
  patients?: {
    total: number;
    active: number;
    changePercent: number;
  };
  vitals?: {
    todayCount: number;
    weekCount: number;
  };
  alerts?: {
    new: number;
    critical: number;
    acknowledged: number;
  };
}

interface UseRealtimeDashboardOptions {
  maxVitalsBuffer?: number;
  maxAlertsBuffer?: number;
  onCriticalAlert?: (alert: RealtimeAlert) => void;
  onNewVital?: (reading: RealtimeVitalReading) => void;
  onPatientStatusChange?: (change: PatientStatusChange) => void;
  onStatsUpdate?: (stats: DashboardStatsUpdate) => void;
}

export function useRealtimeDashboard(options: UseRealtimeDashboardOptions = {}) {
  const {
    maxVitalsBuffer = 50,
    maxAlertsBuffer = 20,
    onCriticalAlert,
    onNewVital,
    onPatientStatusChange,
    onStatsUpdate,
  } = options;

  const { isConnected, connectionError, on, off, subscribe, unsubscribe } = useSocket();

  // State for real-time data
  const [recentVitals, setRecentVitals] = useState<RealtimeVitalReading[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RealtimeAlert[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<RealtimeAlert[]>([]);
  const [patientStatuses, setPatientStatuses] = useState<Map<string, PatientStatusChange>>(
    new Map()
  );
  const [stats, setStats] = useState<DashboardStatsUpdate | null>(null);

  // Track if we've subscribed
  const subscribedRef = useRef(false);

  // Handle new vital reading
  const handleNewVital = useCallback(
    (data: RealtimeVitalReading) => {
      setRecentVitals((prev) => {
        const updated = [data, ...prev].slice(0, maxVitalsBuffer);
        return updated;
      });
      onNewVital?.(data);
    },
    [maxVitalsBuffer, onNewVital]
  );

  // Handle threshold exceeded (creates alert)
  const handleThresholdExceeded = useCallback(
    (data: { reading: RealtimeVitalReading; alert: RealtimeAlert }) => {
      // Add to vitals
      handleNewVital(data.reading);

      // Add alert
      setRecentAlerts((prev) => {
        const updated = [data.alert, ...prev].slice(0, maxAlertsBuffer);
        return updated;
      });

      // If critical, add to critical alerts
      if (data.alert.severity === 'CRITICAL') {
        setCriticalAlerts((prev) => [data.alert, ...prev]);
        onCriticalAlert?.(data.alert);
      }
    },
    [handleNewVital, maxAlertsBuffer, onCriticalAlert]
  );

  // Handle new alert
  const handleNewAlert = useCallback(
    (data: RealtimeAlert) => {
      setRecentAlerts((prev) => {
        const updated = [data, ...prev].slice(0, maxAlertsBuffer);
        return updated;
      });
    },
    [maxAlertsBuffer]
  );

  // Handle critical alert
  const handleCriticalAlert = useCallback(
    (data: RealtimeAlert) => {
      setCriticalAlerts((prev) => [data, ...prev]);
      onCriticalAlert?.(data);
    },
    [onCriticalAlert]
  );

  // Handle alert escalation
  const handleAlertEscalated = useCallback(
    (data: { alertId: string; newLevel: number; assignedToId?: string }) => {
      setRecentAlerts((prev) =>
        prev.map((alert) =>
          alert.id === data.alertId
            ? { ...alert, escalationLevel: data.newLevel, assignedToId: data.assignedToId }
            : alert
        )
      );
    },
    []
  );

  // Handle patient status change
  const handlePatientStatusChange = useCallback(
    (data: PatientStatusChange) => {
      setPatientStatuses((prev) => {
        const updated = new Map(prev);
        updated.set(data.patientId, data);
        return updated;
      });
      onPatientStatusChange?.(data);
    },
    [onPatientStatusChange]
  );

  // Handle dashboard stats update
  const handleStatsUpdate = useCallback(
    (data: DashboardStatsUpdate) => {
      setStats((prev) => ({
        ...prev,
        ...data,
      }));
      onStatsUpdate?.(data);
    },
    [onStatsUpdate]
  );

  // Subscribe to events when connected
  useEffect(() => {
    if (!isConnected || subscribedRef.current) return;

    // Subscribe to organization room
    subscribe('dashboard');
    subscribedRef.current = true;

    // Set up event listeners - cast handlers to satisfy socket.io's unknown[] signature
    const cleanups = [
      on(WS_EVENTS.VITAL_READING_NEW, handleNewVital as (...args: unknown[]) => void),
      on(WS_EVENTS.VITAL_THRESHOLD_EXCEEDED, handleThresholdExceeded as (...args: unknown[]) => void),
      on(WS_EVENTS.ALERT_NEW, handleNewAlert as (...args: unknown[]) => void),
      on(WS_EVENTS.ALERT_CRITICAL, handleCriticalAlert as (...args: unknown[]) => void),
      on(WS_EVENTS.ALERT_ESCALATED, handleAlertEscalated as (...args: unknown[]) => void),
      on(WS_EVENTS.PATIENT_STATUS_CHANGED, handlePatientStatusChange as (...args: unknown[]) => void),
      on(WS_EVENTS.DASHBOARD_STATS_UPDATE, handleStatsUpdate as (...args: unknown[]) => void),
    ];

    return () => {
      cleanups.forEach((cleanup) => cleanup?.());
      unsubscribe('dashboard');
      subscribedRef.current = false;
    };
  }, [
    isConnected,
    subscribe,
    unsubscribe,
    on,
    handleNewVital,
    handleThresholdExceeded,
    handleNewAlert,
    handleCriticalAlert,
    handleAlertEscalated,
    handlePatientStatusChange,
    handleStatsUpdate,
  ]);

  // Clear a critical alert (dismiss)
  const dismissCriticalAlert = useCallback((alertId: string) => {
    setCriticalAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  // Clear all critical alerts
  const dismissAllCriticalAlerts = useCallback(() => {
    setCriticalAlerts([]);
  }, []);

  // Clear recent vitals
  const clearRecentVitals = useCallback(() => {
    setRecentVitals([]);
  }, []);

  // Clear recent alerts
  const clearRecentAlerts = useCallback(() => {
    setRecentAlerts([]);
  }, []);

  return {
    // Connection status
    isConnected,
    connectionError,

    // Real-time data
    recentVitals,
    recentAlerts,
    criticalAlerts,
    patientStatuses: Array.from(patientStatuses.values()),
    stats,

    // Actions
    dismissCriticalAlert,
    dismissAllCriticalAlerts,
    clearRecentVitals,
    clearRecentAlerts,

    // Counts
    vitalsCount: recentVitals.length,
    alertsCount: recentAlerts.length,
    criticalCount: criticalAlerts.length,
  };
}
