/**
 * RPM Example Routes
 * Demonstrates RBAC middleware usage patterns
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth-middleware';
import {
  requirePermission,
  requireAllPermissions,
  requirePatientAccess,
  requireMFA,
} from '../middleware/permission-middleware';

const router = Router();

/**
 * Example: Get all patients
 * Requires permission to read all patients
 */
router.get(
  '/patients',
  authenticate,
  requirePermission('patients:read:all', 'patients:read:assigned'),
  async (req, res) => {
    // If user has patients:read:all, return all patients
    // If user has patients:read:assigned, filter to assigned only
    const canReadAll = req.user?.permissions?.includes('patients:read:all');

    res.json({
      message: canReadAll ? 'All patients' : 'Assigned patients only',
      permissions: req.user?.permissions,
    });
  }
);

/**
 * Example: Get specific patient
 * Validates patient access based on assignment/consent/ownership
 */
router.get(
  '/patients/:patientId',
  authenticate,
  requirePatientAccess('patientId'),
  async (req, res) => {
    // Access already validated - user can access this patient
    res.json({
      message: `Access granted to patient ${req.params.patientId}`,
      patientId: req.params.patientId,
    });
  }
);

/**
 * Example: Create care plan
 * Requires both read and write permissions
 */
router.post(
  '/care-plans',
  authenticate,
  requireAllPermissions('care_plans:write:all', 'patients:read:all'),
  async (req, res) => {
    res.json({
      message: 'Care plan created',
      permissions: req.user?.permissions,
    });
  }
);

/**
 * Example: Acknowledge alert
 * Requires acknowledge permission
 */
router.post(
  '/alerts/:alertId/acknowledge',
  authenticate,
  requirePermission('alerts:acknowledge'),
  async (req, res) => {
    res.json({
      message: `Alert ${req.params.alertId} acknowledged`,
      acknowledgedBy: req.user?.userId,
    });
  }
);

/**
 * Example: Escalate alert
 * Requires escalate permission
 */
router.post(
  '/alerts/:alertId/escalate',
  authenticate,
  requirePermission('alerts:escalate'),
  async (req, res) => {
    res.json({
      message: `Alert ${req.params.alertId} escalated`,
      escalatedBy: req.user?.userId,
    });
  }
);

/**
 * Example: Submit billing claim
 * Requires billing write permission AND MFA
 */
router.post(
  '/billing/claims',
  authenticate,
  requirePermission('billing:write'),
  requireMFA(),
  async (req, res) => {
    res.json({
      message: 'Billing claim submitted',
      mfaVerified: true,
    });
  }
);

/**
 * Example: View program analytics
 * Requires program analytics permission
 */
router.get(
  '/analytics/program',
  authenticate,
  requirePermission('program:analytics'),
  async (req, res) => {
    res.json({
      message: 'Program analytics data',
      organizationId: req.organizationId,
    });
  }
);

/**
 * Example: Manage system users
 * Requires system users permission
 */
router.post(
  '/admin/users',
  authenticate,
  requirePermission('system:users'),
  async (req, res) => {
    res.json({
      message: 'User created',
      adminUserId: req.user?.userId,
    });
  }
);

export default router;
