import { Prisma } from '@prisma/client';

/**
 * Soft Delete Middleware
 * Automatically filters out soft-deleted records by default
 * Adds deletedAt timestamp instead of hard deleting
 */

// Models that support soft delete
const SOFT_DELETE_MODELS = [
  'User',
  'Organization',
  'Team',
  'Patient',
  'File',
] as const;

type SoftDeleteModel = typeof SOFT_DELETE_MODELS[number];

function isSoftDeleteModel(model: string): model is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes(model as SoftDeleteModel);
}

export function createSoftDeleteMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const { model, action } = params;

    if (!model || !isSoftDeleteModel(model)) {
      return next(params);
    }

    // Convert delete to update with deletedAt
    if (action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }

    // Convert deleteMany to updateMany with deletedAt
    if (action === 'deleteMany') {
      params.action = 'updateMany';
      if (params.args.data) {
        params.args.data.deletedAt = new Date();
      } else {
        params.args.data = { deletedAt: new Date() };
      }
    }

    // Add deletedAt: null filter to read operations
    if (action === 'findUnique' || action === 'findFirst') {
      params.action = 'findFirst';
      params.args.where = {
        ...params.args.where,
        deletedAt: null,
      };
    }

    if (action === 'findMany') {
      if (params.args.where) {
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      } else {
        params.args.where = { deletedAt: null };
      }
    }

    // Add deletedAt: null filter to count operations
    if (action === 'count') {
      if (params.args.where) {
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      } else {
        params.args.where = { deletedAt: null };
      }
    }

    // Update and updateMany should only affect non-deleted records
    if (action === 'update' || action === 'updateMany') {
      if (params.args.where) {
        params.args.where.deletedAt = null;
      } else {
        params.args.where = { deletedAt: null };
      }
    }

    return next(params);
  };
}

/**
 * Prisma Client Extension for accessing all records including deleted
 * Usage: prisma.$allRecords.user.findMany() - includes deleted records
 */
export const allRecordsExtension = Prisma.defineExtension({
  name: 'allRecords',
  client: {
    $allRecords: {
      user: {},
      organization: {},
      team: {},
      patient: {},
      file: {},
    },
  },
});
