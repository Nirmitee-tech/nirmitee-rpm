import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    pending: number;
    changePercent: number;
  };
  teams: {
    total: number;
    changePercent: number;
  };
  roles: {
    total: number;
  };
  invitations: {
    pending: number;
    sent: number;
  };
  patients: {
    total: number;
    active: number;
    pending: number;
    changePercent: number;
  };
  alerts: {
    new: number;
    critical: number;
  };
  vitals: {
    todayCount: number;
    weekCount: number;
  };
}

export interface RecentActivity {
  id: string;
  user: string;
  action: string;
  entityType: string;
  time: string;
  type: 'create' | 'update' | 'delete';
}

export interface VitalsTrendPoint {
  date: string;
  bpReadings: number;
  glucoseReadings: number;
  weightReadings: number;
  totalReadings: number;
}

export interface AlertDistribution {
  critical: number;
  significant: number;
  informational: number;
  total: number;
}

export interface PatientAttention {
  id: string;
  firstName: string;
  lastName: string;
  conditions: string[];
  lastVital?: {
    type: string;
    value: string;
    status: string;
    time: string;
  };
  alertCount: number;
  alertSeverity: 'warning' | 'critical';
  phone?: string;
}

export const dashboardService = {
  async getStats(organizationId: string): Promise<DashboardStats> {
    // Get date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get current period stats
    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      totalTeams,
      totalRoles,
      pendingInvitations,
      sentInvitations,
      totalPatients,
      activePatients,
      pendingPatients,
      newAlerts,
      criticalAlerts,
      todayVitals,
      weekVitals,
    ] = await Promise.all([
      prisma.organizationMember.count({
        where: { organizationId },
      }),
      prisma.organizationMember.count({
        where: {
          organizationId,
          status: 'ACTIVE',
        },
      }),
      prisma.organizationMember.count({
        where: {
          organizationId,
          status: 'INACTIVE',
        },
      }),
      prisma.team.count({
        where: { organizationId },
      }),
      prisma.role.count({
        where: { organizationId },
      }),
      prisma.invitation.count({
        where: {
          organizationId,
          status: 'PENDING',
        },
      }),
      prisma.invitation.count({
        where: {
          organizationId,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
      }),
      // Patient stats
      prisma.patient.count({
        where: { organizationId },
      }),
      prisma.patient.count({
        where: {
          organizationId,
          enrollmentStatus: 'ACTIVE',
        },
      }),
      prisma.patient.count({
        where: {
          organizationId,
          enrollmentStatus: 'PENDING',
        },
      }),
      // Alert stats
      prisma.alert.count({
        where: {
          patient: { organizationId },
          status: 'NEW',
        },
      }),
      prisma.alert.count({
        where: {
          patient: { organizationId },
          severity: 'CRITICAL',
          status: { in: ['NEW', 'ACKNOWLEDGED'] },
        },
      }),
      // Vitals stats - today
      prisma.vitalReading.count({
        where: {
          patient: { organizationId },
          createdAt: { gte: today },
        },
      }),
      // Vitals stats - last 7 days
      prisma.vitalReading.count({
        where: {
          patient: { organizationId },
          createdAt: { gte: weekAgo },
        },
      }),
    ]);

    // Calculate change percentage (compare with 30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const previousUsers = await prisma.organizationMember.count({
      where: {
        organizationId,
        joinedAt: { lt: thirtyDaysAgo },
      },
    });

    const [previousTeams, previousPatients] = await Promise.all([
      prisma.team.count({
        where: {
          organizationId,
          createdAt: { lt: thirtyDaysAgo },
        },
      }),
      prisma.patient.count({
        where: {
          organizationId,
          createdAt: { lt: thirtyDaysAgo },
        },
      }),
    ]);

    const userChangePercent = previousUsers > 0
      ? Math.round(((totalUsers - previousUsers) / previousUsers) * 100 * 10) / 10
      : 0;

    const teamChangePercent = previousTeams > 0
      ? Math.round(((totalTeams - previousTeams) / previousTeams) * 100 * 10) / 10
      : 0;

    const patientChangePercent = previousPatients > 0
      ? Math.round(((totalPatients - previousPatients) / previousPatients) * 100 * 10) / 10
      : 0;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        pending: pendingUsers,
        changePercent: userChangePercent,
      },
      teams: {
        total: totalTeams,
        changePercent: teamChangePercent,
      },
      roles: {
        total: totalRoles,
      },
      invitations: {
        pending: pendingInvitations,
        sent: sentInvitations,
      },
      patients: {
        total: totalPatients,
        active: activePatients,
        pending: pendingPatients,
        changePercent: patientChangePercent,
      },
      alerts: {
        new: newAlerts,
        critical: criticalAlerts,
      },
      vitals: {
        todayCount: todayVitals,
        weekCount: weekVitals,
      },
    };
  },

  async getRecentActivity(organizationId: string, limit = 10): Promise<RecentActivity[]> {
    const logs = await prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Fetch user names for logs that have userId
    const userIds = logs.map(log => log.userId).filter((id): id is string => id !== null);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

    return logs.map(log => ({
      id: log.id,
      user: log.userId ? userMap.get(log.userId) || 'Unknown User' : 'System',
      action: formatAction(log.action, log.entity),
      entityType: log.entity,
      time: formatTimeAgo(log.createdAt),
      type: mapActionType(log.action),
    }));
  },

  async getVitalsTrend(organizationId: string, days = 7): Promise<VitalsTrendPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all vitals in the date range
    const vitals = await prisma.vitalReading.findMany({
      where: {
        patient: { organizationId },
        createdAt: { gte: startDate },
      },
      select: {
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const groupedByDate = new Map<string, { bp: number; glucose: number; weight: number; total: number }>();

    // Initialize all dates in range
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      groupedByDate.set(dateStr, { bp: 0, glucose: 0, weight: 0, total: 0 });
    }

    // Count vitals by type and date
    vitals.forEach(vital => {
      const dateStr = vital.createdAt.toISOString().split('T')[0];
      const existing = groupedByDate.get(dateStr);
      if (existing) {
        existing.total++;
        if (vital.type === 'BLOOD_PRESSURE') existing.bp++;
        else if (vital.type === 'BLOOD_GLUCOSE') existing.glucose++;
        else if (vital.type === 'WEIGHT') existing.weight++;
      }
    });

    // Convert to array
    return Array.from(groupedByDate.entries()).map(([date, counts]) => ({
      date,
      bpReadings: counts.bp,
      glucoseReadings: counts.glucose,
      weightReadings: counts.weight,
      totalReadings: counts.total,
    }));
  },

  async getAlertDistribution(organizationId: string): Promise<AlertDistribution> {
    const [critical, significant, informational] = await Promise.all([
      prisma.alert.count({
        where: {
          patient: { organizationId },
          severity: 'CRITICAL',
          status: { in: ['NEW', 'ACKNOWLEDGED'] },
        },
      }),
      prisma.alert.count({
        where: {
          patient: { organizationId },
          severity: 'SIGNIFICANT',
          status: { in: ['NEW', 'ACKNOWLEDGED'] },
        },
      }),
      prisma.alert.count({
        where: {
          patient: { organizationId },
          severity: 'INFORMATIONAL',
          status: { in: ['NEW', 'ACKNOWLEDGED'] },
        },
      }),
    ]);

    return {
      critical,
      significant,
      informational,
      total: critical + significant + informational,
    };
  },

  async getPatientsRequiringAttention(organizationId: string, limit = 10): Promise<PatientAttention[]> {
    // Get patients with active critical or significant alerts
    const patientsWithAlerts = await prisma.patient.findMany({
      where: {
        organizationId,
        alerts: {
          some: {
            status: { in: ['NEW', 'ACKNOWLEDGED'] },
            severity: { in: ['CRITICAL', 'SIGNIFICANT'] },
          },
        },
      },
      include: {
        alerts: {
          where: {
            status: { in: ['NEW', 'ACKNOWLEDGED'] },
            severity: { in: ['CRITICAL', 'SIGNIFICANT'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        vitalReadings: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      take: limit,
    });

    return patientsWithAlerts.map(patient => {
      const latestAlert = patient.alerts[0];
      const latestVital = patient.vitalReadings[0];
      const hasCritical = patient.alerts.some(a => a.severity === 'CRITICAL');

      return {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        conditions: (patient.conditions as string[]) || [],
        lastVital: latestVital ? {
          type: formatVitalType(latestVital.type),
          value: formatVitalValue(latestVital.type, latestVital.values as Record<string, number>),
          status: latestVital.status || 'normal',
          time: formatTimeAgo(latestVital.createdAt),
        } : undefined,
        alertCount: patient.alerts.length,
        alertSeverity: hasCritical ? 'critical' : 'warning',
        phone: patient.phone || undefined,
      };
    });
  },
};

function formatAction(action: string, entity: string): string {
  const actions: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    LOGIN: 'Logged in',
    LOGOUT: 'Logged out',
    INVITE: 'Invited user',
    ACCEPT: 'Accepted invitation',
    ASSIGN: 'Assigned',
    REMOVE: 'Removed',
  };
  return `${actions[action] || action} ${entity.toLowerCase()}`;
}

function mapActionType(action: string): 'create' | 'update' | 'delete' {
  if (action === 'CREATE' || action === 'INVITE' || action === 'ACCEPT') return 'create';
  if (action === 'DELETE' || action === 'REMOVE') return 'delete';
  return 'update';
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function formatVitalType(type: string): string {
  const types: Record<string, string> = {
    BLOOD_PRESSURE: 'BP',
    BLOOD_GLUCOSE: 'Glucose',
    WEIGHT: 'Weight',
    PULSE_OXIMETRY: 'SpO2',
    HEART_RATE: 'HR',
    TEMPERATURE: 'Temp',
    RESPIRATORY_RATE: 'RR',
  };
  return types[type] || type;
}

function formatVitalValue(type: string, values: Record<string, number>): string {
  if (!values) return 'N/A';

  switch (type) {
    case 'BLOOD_PRESSURE':
      return `${values.systolic || 0}/${values.diastolic || 0} mmHg`;
    case 'BLOOD_GLUCOSE':
      return `${values.glucose || 0} mg/dL`;
    case 'WEIGHT':
      return `${values.weight || 0} kg`;
    case 'PULSE_OXIMETRY':
      return `${values.oxygen || values.spo2 || 0}%`;
    case 'HEART_RATE':
      return `${values.heartRate || 0} bpm`;
    case 'TEMPERATURE':
      return `${values.temperature || 0}°F`;
    default:
      return Object.values(values)[0]?.toString() || 'N/A';
  }
}
