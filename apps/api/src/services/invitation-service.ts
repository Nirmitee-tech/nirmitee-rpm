import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/api-error';
import { randomBytes } from 'crypto';
import { notificationService } from './notification-service';
import { audit } from './audit-service';
import { emailService } from './email-service';

interface SendInvitationData {
  email: string;
  roleId: string;
  organizationId: string;
  invitedById: string;
}

class InvitationService {
  /**
   * Generate secure invitation token
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Send invitation to join organization
   */
  async sendInvitation(data: SendInvitationData) {
    // Check if user already exists in org
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        organizations: {
          where: { organizationId: data.organizationId },
        },
      },
    });

    if (existingUser?.organizations.length) {
      throw ApiError.conflict('User is already a member of this organization');
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        email: data.email,
        organizationId: data.organizationId,
        status: 'PENDING',
      },
    });

    if (existingInvite) {
      throw ApiError.conflict('An invitation has already been sent to this email');
    }

    // Verify role exists
    const role = await prisma.role.findFirst({
      where: { id: data.roleId, organizationId: data.organizationId },
    });

    if (!role) {
      throw ApiError.badRequest('Invalid role');
    }

    // Get organization and inviter info
    const [organization, inviter] = await Promise.all([
      prisma.organization.findUnique({ where: { id: data.organizationId } }),
      prisma.user.findUnique({ where: { id: data.invitedById } }),
    ]);

    // Create invitation
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        email: data.email,
        organizationId: data.organizationId,
        roleId: data.roleId,
        token,
        expiresAt,
        invitedById: data.invitedById,
      },
      include: {
        organization: true,
        role: true,
      },
    });

    // Audit log
    await audit({
      userId: data.invitedById,
      organizationId: data.organizationId,
      action: 'user.invited',
      entity: 'invitation',
      entityId: invitation.id,
      newValues: { email: data.email, role: role.name },
    });

    // Send invitation email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/invite/${token}`;
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'A team member';

    await emailService.sendInvitationEmail(data.email, {
      inviterName,
      organizationName: organization?.name || 'the organization',
      roleName: role.name,
      inviteUrl,
      expiresIn: '7 days',
    }, data.organizationId);

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role.name,
      expiresAt: invitation.expiresAt,
      inviteUrl: `${process.env.FRONTEND_URL}/invite/${token}`,
    };
  }

  /**
   * Accept invitation and join organization
   */
  async acceptInvitation(token: string, userId?: string, userData?: { password: string; firstName: string; lastName: string }) {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!invitation) {
      throw ApiError.notFound('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw ApiError.badRequest(`Invitation has already been ${invitation.status.toLowerCase()}`);
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw ApiError.badRequest('Invitation has expired');
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (!user && userData) {
      // Create new user
      const { hashPassword } = await import('../utils/password');
      const passwordHash = await hashPassword(userData.password);

      user = await prisma.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
      });
    } else if (!user) {
      throw ApiError.badRequest('User registration required');
    }

    // Add user to organization
    await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          roleId: invitation.roleId,
          status: 'ACTIVE',
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    // Audit log
    await audit({
      userId: user.id,
      organizationId: invitation.organizationId,
      action: 'user.invitation_accepted',
      entity: 'user',
      entityId: user.id,
      newValues: { role: invitation.role.name },
    });

    // Notify user
    await notificationService.notifyUserAdded(
      user.id,
      invitation.organization.name,
      'Invitation',
      invitation.organizationId
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
      },
      role: invitation.role.name,
    };
  }

  /**
   * Get invitation details by token
   */
  async getInvitationByToken(token: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!invitation) {
      throw ApiError.notFound('Invitation not found');
    }

    return {
      email: invitation.email,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        logo: invitation.organization.logo,
      },
      role: invitation.role.name,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      isExpired: invitation.expiresAt < new Date(),
    };
  }

  /**
   * List pending invitations for organization
   */
  async listInvitations(organizationId: string, options?: { page?: number; limit?: number }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where = { organizationId, status: 'PENDING' as const };

    const [invitations, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        skip,
        take: limit,
        include: { role: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invitation.count({ where }),
    ]);

    return {
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role.name,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Resend invitation
   */
  async resendInvitation(invitationId: string, organizationId: string) {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId, status: 'PENDING' },
    });

    if (!invitation) {
      throw ApiError.notFound('Invitation not found');
    }

    // Generate new token and extend expiry
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await prisma.invitation.update({
      where: { id: invitationId },
      data: { token, expiresAt },
      include: { role: true, organization: true },
    });

    // Resend invitation email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/invite/${token}`;

    await emailService.sendInvitationEmail(invitation.email, {
      inviterName: 'The team',
      organizationName: updated.organization.name,
      roleName: updated.role.name,
      inviteUrl,
      expiresIn: '7 days',
    }, organizationId);

    return {
      id: updated.id,
      email: updated.email,
      role: updated.role.name,
      expiresAt: updated.expiresAt,
    };
  }

  /**
   * Revoke invitation
   */
  async revokeInvitation(invitationId: string, organizationId: string) {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId, status: 'PENDING' },
    });

    if (!invitation) {
      throw ApiError.notFound('Invitation not found');
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });

    return { message: 'Invitation revoked' };
  }
}

export const invitationService = new InvitationService();
