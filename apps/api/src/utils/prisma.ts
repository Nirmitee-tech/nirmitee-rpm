import { PrismaClient } from '@prisma/client';
import { createSoftDeleteMiddleware } from '../middleware/soft-delete-middleware';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Apply soft delete middleware
prismaClient.$use(createSoftDeleteMiddleware());

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
