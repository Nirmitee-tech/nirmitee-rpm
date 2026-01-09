import { prisma } from '../utils/prisma';
import { AlertConditionLogic, AlertSeverity, Prisma } from '@prisma/client';
import { auditService } from './audit-service';

// ============================================
// TYPES
// ============================================

interface AlertCondition {
  id: string;
  vital: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';
  value: number;
}

interface CreateAlertRuleData {
  name: string;
  description?: string;
  conditions: AlertCondition[];
  conditionLogic?: 'AND' | 'OR';
  severity: 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL';
  actions: string[];
  isEnabled?: boolean;
}

interface UpdateAlertRuleData {
  name?: string;
  description?: string;
  conditions?: AlertCondition[];
  conditionLogic?: 'AND' | 'OR';
  severity?: 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL';
  actions?: string[];
  isEnabled?: boolean;
}

interface AlertRuleFilters {
  severity?: AlertSeverity;
  isEnabled?: boolean;
  page?: number;
  limit?: number;
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

async function getAlertRules(
  organizationId: string,
  filters: AlertRuleFilters = {}
) {
  const { severity, isEnabled, page = 1, limit = 50 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.AlertRuleWhereInput = {
    organizationId,
    ...(severity && { severity }),
    ...(isEnabled !== undefined && { isEnabled }),
  };

  const [rules, total] = await Promise.all([
    prisma.alertRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    prisma.alertRule.count({ where }),
  ]);

  return {
    rules,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

async function getAlertRule(id: string, organizationId: string) {
  const rule = await prisma.alertRule.findFirst({
    where: { id, organizationId },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  if (!rule) {
    throw new Error('Alert rule not found');
  }

  return rule;
}

async function createAlertRule(
  organizationId: string,
  data: CreateAlertRuleData,
  createdById: string
) {
  const rule = await prisma.alertRule.create({
    data: {
      organizationId,
      name: data.name,
      description: data.description,
      conditions: data.conditions as unknown as Prisma.InputJsonValue,
      conditionLogic: (data.conditionLogic || 'AND') as AlertConditionLogic,
      severity: data.severity as AlertSeverity,
      actions: data.actions,
      isEnabled: data.isEnabled ?? true,
      createdById,
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await auditService.log({
    userId: createdById,
    organizationId,
    action: 'escalation_rule.created',
    entity: 'escalation_rule',
    entityId: rule.id,
    metadata: { ruleName: data.name, severity: data.severity },
  });

  return rule;
}

async function updateAlertRule(
  id: string,
  organizationId: string,
  data: UpdateAlertRuleData,
  updatedById: string
) {
  const existing = await prisma.alertRule.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Alert rule not found');
  }

  const rule = await prisma.alertRule.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.conditions && { conditions: data.conditions as unknown as Prisma.InputJsonValue }),
      ...(data.conditionLogic && { conditionLogic: data.conditionLogic as AlertConditionLogic }),
      ...(data.severity && { severity: data.severity as AlertSeverity }),
      ...(data.actions && { actions: data.actions }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await auditService.log({
    userId: updatedById,
    organizationId,
    action: 'escalation_rule.updated',
    entity: 'escalation_rule',
    entityId: id,
    newValues: data as Record<string, unknown>,
  });

  return rule;
}

async function deleteAlertRule(
  id: string,
  organizationId: string,
  deletedById: string
) {
  const existing = await prisma.alertRule.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Alert rule not found');
  }

  await prisma.alertRule.delete({ where: { id } });

  await auditService.log({
    userId: deletedById,
    organizationId,
    action: 'escalation_rule.deleted',
    entity: 'escalation_rule',
    entityId: id,
    metadata: { ruleName: existing.name },
  });
}

async function toggleAlertRule(
  id: string,
  organizationId: string,
  updatedById: string
) {
  const existing = await prisma.alertRule.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Alert rule not found');
  }

  const rule = await prisma.alertRule.update({
    where: { id },
    data: { isEnabled: !existing.isEnabled },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await auditService.log({
    userId: updatedById,
    organizationId,
    action: 'escalation_rule.updated',
    entity: 'escalation_rule',
    entityId: id,
    metadata: { isEnabled: rule.isEnabled },
  });

  return rule;
}

async function incrementTriggeredCount(id: string) {
  await prisma.alertRule.update({
    where: { id },
    data: {
      triggeredCount: { increment: 1 },
      lastTriggeredAt: new Date(),
    },
  });
}

export const alertRuleService = {
  getAlertRules,
  getAlertRule,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
  incrementTriggeredCount,
};
