import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default achievements available to all organizations
const DEFAULT_ACHIEVEMENTS = [
  // Milestone achievements
  {
    code: 'FIRST_READING',
    name: 'First Steps',
    description: 'Recorded your first vital reading',
    icon: 'heart-pulse',
    category: 'MILESTONE',
    pointValue: 10,
    requirementType: 'FIRST_READING',
    requirementValue: 1,
    sortOrder: 1,
  },
  {
    code: 'READINGS_10',
    name: 'Getting Started',
    description: 'Recorded 10 vital readings',
    icon: 'activity',
    category: 'MILESTONE',
    pointValue: 25,
    requirementType: 'TOTAL_READINGS',
    requirementValue: 10,
    sortOrder: 2,
  },
  {
    code: 'READINGS_50',
    name: 'Consistent Tracker',
    description: 'Recorded 50 vital readings',
    icon: 'trending-up',
    category: 'MILESTONE',
    pointValue: 50,
    requirementType: 'TOTAL_READINGS',
    requirementValue: 50,
    sortOrder: 3,
  },
  {
    code: 'READINGS_100',
    name: 'Health Champion',
    description: 'Recorded 100 vital readings',
    icon: 'trophy',
    category: 'MILESTONE',
    pointValue: 100,
    requirementType: 'TOTAL_READINGS',
    requirementValue: 100,
    sortOrder: 4,
  },
  {
    code: 'READINGS_500',
    name: 'Health Master',
    description: 'Recorded 500 vital readings',
    icon: 'crown',
    category: 'MILESTONE',
    pointValue: 250,
    requirementType: 'TOTAL_READINGS',
    requirementValue: 500,
    sortOrder: 5,
  },

  // Streak achievements
  {
    code: 'STREAK_3',
    name: 'Three Day Streak',
    description: 'Recorded vitals 3 days in a row',
    icon: 'flame',
    category: 'STREAK',
    pointValue: 15,
    requirementType: 'STREAK_DAYS',
    requirementValue: 3,
    sortOrder: 10,
  },
  {
    code: 'STREAK_7',
    name: 'Week Warrior',
    description: 'Recorded vitals 7 days in a row',
    icon: 'flame',
    category: 'STREAK',
    pointValue: 35,
    requirementType: 'STREAK_DAYS',
    requirementValue: 7,
    sortOrder: 11,
  },
  {
    code: 'STREAK_14',
    name: 'Two Week Champion',
    description: 'Recorded vitals 14 days in a row',
    icon: 'zap',
    category: 'STREAK',
    pointValue: 75,
    requirementType: 'STREAK_DAYS',
    requirementValue: 14,
    sortOrder: 12,
  },
  {
    code: 'STREAK_30',
    name: 'Monthly Master',
    description: 'Recorded vitals 30 days in a row',
    icon: 'star',
    category: 'STREAK',
    pointValue: 150,
    requirementType: 'STREAK_DAYS',
    requirementValue: 30,
    sortOrder: 13,
  },
  {
    code: 'STREAK_90',
    name: 'Quarterly Legend',
    description: 'Recorded vitals 90 days in a row',
    icon: 'award',
    category: 'STREAK',
    pointValue: 500,
    requirementType: 'STREAK_DAYS',
    requirementValue: 90,
    sortOrder: 14,
  },

  // Weekly goal achievements
  {
    code: 'WEEKLY_GOAL_1',
    name: 'Goal Getter',
    description: 'Completed your first weekly goal',
    icon: 'target',
    category: 'GOALS',
    pointValue: 25,
    requirementType: 'WEEKLY_GOAL',
    requirementValue: 1,
    sortOrder: 20,
  },
  {
    code: 'WEEKLY_GOAL_4',
    name: 'Monthly Goals',
    description: 'Completed weekly goals for 4 weeks',
    icon: 'check-circle',
    category: 'GOALS',
    pointValue: 100,
    requirementType: 'WEEKLY_GOAL',
    requirementValue: 4,
    sortOrder: 21,
  },
  {
    code: 'WEEKLY_GOAL_12',
    name: 'Quarter Champion',
    description: 'Completed weekly goals for 12 weeks',
    icon: 'medal',
    category: 'GOALS',
    pointValue: 300,
    requirementType: 'WEEKLY_GOAL',
    requirementValue: 12,
    sortOrder: 22,
  },

  // Health status achievements
  {
    code: 'HEALTH_NORMAL_7',
    name: 'Healthy Week',
    description: 'Maintained normal vitals for 7 days',
    icon: 'heart',
    category: 'HEALTH',
    pointValue: 50,
    requirementType: 'HEALTH_STATUS_DAYS',
    requirementValue: 7,
    sortOrder: 30,
  },
  {
    code: 'HEALTH_NORMAL_30',
    name: 'Healthy Month',
    description: 'Maintained normal vitals for 30 days',
    icon: 'shield-check',
    category: 'HEALTH',
    pointValue: 200,
    requirementType: 'HEALTH_STATUS_DAYS',
    requirementValue: 30,
    sortOrder: 31,
  },
];

export async function seedAchievements() {
  console.log('Seeding achievements...');

  let created = 0;
  let updated = 0;

  for (const achievement of DEFAULT_ACHIEVEMENTS) {
    // Check if achievement exists (global achievements have null organizationId)
    const existing = await prisma.achievement.findFirst({
      where: {
        code: achievement.code,
        organizationId: null,
      },
    });

    if (existing) {
      // Update existing
      await prisma.achievement.update({
        where: { id: existing.id },
        data: {
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category as 'MILESTONE' | 'STREAK' | 'GOALS' | 'MEDICATION' | 'EDUCATION' | 'HEALTH',
          pointValue: achievement.pointValue,
          requirementType: achievement.requirementType as 'FIRST_READING' | 'STREAK_DAYS' | 'WEEKLY_GOAL' | 'MEDICATION_STREAK' | 'LESSONS_COMPLETED' | 'HEALTH_STATUS_DAYS' | 'TOTAL_READINGS',
          requirementValue: achievement.requirementValue,
          sortOrder: achievement.sortOrder,
          isActive: true,
        },
      });
      updated++;
    } else {
      // Create new
      await prisma.achievement.create({
        data: {
          code: achievement.code,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category as 'MILESTONE' | 'STREAK' | 'GOALS' | 'MEDICATION' | 'EDUCATION' | 'HEALTH',
          pointValue: achievement.pointValue,
          requirementType: achievement.requirementType as 'FIRST_READING' | 'STREAK_DAYS' | 'WEEKLY_GOAL' | 'MEDICATION_STREAK' | 'LESSONS_COMPLETED' | 'HEALTH_STATUS_DAYS' | 'TOTAL_READINGS',
          requirementValue: achievement.requirementValue,
          sortOrder: achievement.sortOrder,
          isActive: true,
        },
      });
      created++;
    }
  }

  console.log(`✓ Seeded achievements: ${created} created, ${updated} updated`);
}

// Allow direct execution
if (require.main === module) {
  seedAchievements()
    .catch((e) => {
      console.error('Seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default seedAchievements;
