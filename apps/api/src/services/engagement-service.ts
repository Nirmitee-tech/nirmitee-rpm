import { prisma } from '../utils/prisma';
import { GoalType } from '@prisma/client';

// Types for engagement data
export interface EngagementSummary {
  streak: {
    current: number;
    longest: number;
    lastActiveDate: string | null;
  };
  weeklyProgress: {
    current: number;
    target: number;
    percentage: number;
    daysActive: boolean[]; // 7 days, Sun-Sat
  };
  totalStats: {
    readings: number;
    points: number;
  };
}

export interface GoalData {
  id: string;
  name: string;
  description: string | null;
  goalType: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  periodType: string;
  isActive: boolean;
  completedAt: string | null;
}

export interface AchievementData {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  earned: boolean;
  earnedAt: string | null;
  currentProgress: number | null;
}

class EngagementService {
  /**
   * Get or create engagement record for a patient
   */
  async getOrCreateEngagement(patientId: string, organizationId: string) {
    let engagement = await prisma.patientEngagement.findUnique({
      where: { patientId },
    });

    if (!engagement) {
      engagement = await prisma.patientEngagement.create({
        data: {
          patientId,
          organizationId,
          currentStreak: 0,
          longestStreak: 0,
          weeklyReadings: 0,
          weeklyGoalTarget: 21,
          totalReadings: 0,
          totalPoints: 0,
        },
      });
    }

    return engagement;
  }

  /**
   * Get engagement summary for a patient
   */
  async getEngagementSummary(patientId: string, organizationId: string): Promise<EngagementSummary> {
    const engagement = await this.getOrCreateEngagement(patientId, organizationId);

    // Calculate weekly days active
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    // Get readings for this week grouped by day
    const weekReadings = await prisma.vitalReading.findMany({
      where: {
        patientId,
        organizationId,
        recordedAt: {
          gte: startOfWeek,
        },
      },
      select: {
        recordedAt: true,
      },
    });

    // Build days active array
    const daysActive: boolean[] = [false, false, false, false, false, false, false];
    weekReadings.forEach((reading) => {
      const dayOfWeek = reading.recordedAt.getDay();
      daysActive[dayOfWeek] = true;
    });

    return {
      streak: {
        current: engagement.currentStreak,
        longest: engagement.longestStreak,
        lastActiveDate: engagement.lastActiveDate?.toISOString() || null,
      },
      weeklyProgress: {
        current: engagement.weeklyReadings,
        target: engagement.weeklyGoalTarget,
        percentage: Math.min(
          Math.round((engagement.weeklyReadings / engagement.weeklyGoalTarget) * 100),
          100
        ),
        daysActive,
      },
      totalStats: {
        readings: engagement.totalReadings,
        points: engagement.totalPoints,
      },
    };
  }

  /**
   * Update engagement when a vital reading is recorded
   */
  async recordActivity(patientId: string, organizationId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const engagement = await this.getOrCreateEngagement(patientId, organizationId);

    // Check if this is a new day
    const lastActive = engagement.lastActiveDate ? new Date(engagement.lastActiveDate) : null;
    lastActive?.setHours(0, 0, 0, 0);

    const isNewDay = !lastActive || lastActive.getTime() !== today.getTime();
    const isConsecutiveDay =
      lastActive && today.getTime() - lastActive.getTime() === 24 * 60 * 60 * 1000;
    const streakBroken =
      lastActive && today.getTime() - lastActive.getTime() > 24 * 60 * 60 * 1000;

    // Calculate new streak
    let newStreak = engagement.currentStreak;
    if (isNewDay) {
      if (isConsecutiveDay) {
        newStreak = engagement.currentStreak + 1;
      } else if (streakBroken) {
        newStreak = 1; // Start new streak
      } else if (!lastActive) {
        newStreak = 1; // First activity
      }
    }

    // Check if week needs reset
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weekStart = engagement.weekStartDate ? new Date(engagement.weekStartDate) : null;
    const isNewWeek = !weekStart || weekStart.getTime() < startOfWeek.getTime();

    // Update engagement
    await prisma.patientEngagement.update({
      where: { patientId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, engagement.longestStreak),
        lastActiveDate: today,
        weekStartDate: isNewWeek ? startOfWeek : engagement.weekStartDate,
        weeklyReadings: isNewWeek ? 1 : engagement.weeklyReadings + 1,
        totalReadings: engagement.totalReadings + 1,
      },
    });

    // Check for achievements
    await this.checkAchievements(patientId, organizationId);

    // Update goal progress
    await this.updateGoalProgress(patientId, organizationId, 'VITALS');
  }

  /**
   * Get patient goals
   */
  async getGoals(patientId: string, organizationId: string): Promise<GoalData[]> {
    const goals = await prisma.patientGoal.findMany({
      where: {
        patientId,
        organizationId,
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    return goals.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      goalType: g.goalType,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      unit: g.unit,
      periodType: g.periodType,
      isActive: g.isActive,
      completedAt: g.completedAt?.toISOString() || null,
    }));
  }

  /**
   * Create a goal for a patient
   */
  async createGoal(
    patientId: string,
    organizationId: string,
    data: {
      name: string;
      description?: string;
      goalType: 'VITALS' | 'MEDICATION' | 'EDUCATION' | 'EXERCISE' | 'CUSTOM';
      targetValue: number;
      unit?: string;
      periodType?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    }
  ): Promise<GoalData> {
    const goal = await prisma.patientGoal.create({
      data: {
        patientId,
        organizationId,
        name: data.name,
        description: data.description,
        goalType: data.goalType,
        targetValue: data.targetValue,
        unit: data.unit || 'readings',
        periodType: data.periodType || 'WEEKLY',
        periodStartDate: new Date(),
      },
    });

    return {
      id: goal.id,
      name: goal.name,
      description: goal.description,
      goalType: goal.goalType,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      unit: goal.unit,
      periodType: goal.periodType,
      isActive: goal.isActive,
      completedAt: null,
    };
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(
    patientId: string,
    organizationId: string,
    goalType: string
  ): Promise<void> {
    const goals = await prisma.patientGoal.findMany({
      where: {
        patientId,
        organizationId,
        goalType: goalType as GoalType,
        isActive: true,
      },
    });

    for (const goal of goals) {
      const newValue = goal.currentValue + 1;
      const isComplete = newValue >= goal.targetValue;

      await prisma.patientGoal.update({
        where: { id: goal.id },
        data: {
          currentValue: newValue,
          completedAt: isComplete ? new Date() : null,
          isActive: !isComplete,
        },
      });

      // Award points for goal completion
      if (isComplete) {
        await this.awardPoints(patientId, 50); // 50 points per goal
      }
    }
  }

  /**
   * Get achievements for a patient
   */
  async getAchievements(patientId: string, organizationId: string): Promise<AchievementData[]> {
    // Get all available achievements (global + org-specific)
    const allAchievements = await prisma.achievement.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId: null }, { organizationId }],
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Get earned achievements
    const earnedAchievements = await prisma.patientAchievement.findMany({
      where: {
        patientId,
        organizationId,
      },
    });

    const earnedMap = new Map(
      earnedAchievements.map((ea) => [ea.achievementId, ea])
    );

    return allAchievements.map((a) => {
      const earned = earnedMap.get(a.id);
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        pointValue: a.pointValue,
        requirementType: a.requirementType,
        requirementValue: a.requirementValue,
        earned: !!earned,
        earnedAt: earned?.earnedAt?.toISOString() || null,
        currentProgress: earned?.currentProgress || null,
      };
    });
  }

  /**
   * Check and award achievements based on current progress
   */
  async checkAchievements(patientId: string, organizationId: string): Promise<void> {
    const engagement = await this.getOrCreateEngagement(patientId, organizationId);

    // Get all available achievements not yet earned
    const availableAchievements = await prisma.achievement.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId: null }, { organizationId }],
        patientAchievements: {
          none: { patientId },
        },
      },
    });

    for (const achievement of availableAchievements) {
      let earned = false;

      switch (achievement.requirementType) {
        case 'FIRST_READING':
          earned = engagement.totalReadings >= 1;
          break;
        case 'STREAK_DAYS':
          earned = engagement.currentStreak >= achievement.requirementValue;
          break;
        case 'TOTAL_READINGS':
          earned = engagement.totalReadings >= achievement.requirementValue;
          break;
        // Add more cases as needed
      }

      if (earned) {
        await this.awardAchievement(patientId, organizationId, achievement.id, achievement.pointValue);
      }
    }
  }

  /**
   * Award an achievement to a patient
   */
  async awardAchievement(
    patientId: string,
    organizationId: string,
    achievementId: string,
    points: number
  ): Promise<void> {
    // Create achievement record
    await prisma.patientAchievement.create({
      data: {
        patientId,
        achievementId,
        organizationId,
      },
    });

    // Award points
    await this.awardPoints(patientId, points);
  }

  /**
   * Award points to a patient
   */
  async awardPoints(patientId: string, points: number): Promise<void> {
    await prisma.patientEngagement.update({
      where: { patientId },
      data: {
        totalPoints: { increment: points },
      },
    });
  }

  /**
   * Get today's medication adherence summary
   */
  async getMedicationSummary(
    patientId: string,
    organizationId: string
  ): Promise<{
    todayMeds: Array<{
      id: string;
      name: string;
      dosage: string;
      time: string;
      taken: boolean;
    }>;
    adherenceScore: number;
  }> {
    // Get patient medications with today's adherence
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const medications = await prisma.patientMedication.findMany({
      where: {
        patientId,
        organizationId,
        status: 'ACTIVE',
      },
      include: {
        adherenceLogs: {
          where: {
            scheduledTime: {
              gte: today,
              lt: tomorrow,
            },
          },
        },
      },
    });

    const todayMeds = medications.map((med) => {
      const log = med.adherenceLogs[0];
      return {
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        time: med.frequency || '8:00 AM', // Use frequency as time hint
        taken: log?.status === 'TAKEN',
      };
    });

    // Calculate adherence score (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const adherenceLogs = await prisma.medicationAdherence.findMany({
      where: {
        patientId,
        organizationId,
        scheduledTime: { gte: weekAgo },
      },
    });

    const totalLogs = adherenceLogs.length;
    const takenLogs = adherenceLogs.filter((l) => l.status === 'TAKEN').length;
    const adherenceScore = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 0;

    return { todayMeds, adherenceScore };
  }
}

export const engagementService = new EngagementService();
