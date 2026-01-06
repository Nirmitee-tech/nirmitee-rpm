export { api } from './client';
export type { ApiError } from './client';

export { authApi } from './auth';
export type { User, Organization, AuthResponse, SignupData, LoginData } from './auth';

export { usersApi } from './users';
export type { User as UserType, UserDetail, ListUsersResponse, CreateUserData, UpdateUserData } from './users';

export { teamsApi } from './teams';
export type { Team, TeamDetail, TeamMember, ListTeamsResponse, CreateTeamData, UpdateTeamData } from './teams';

export { rolesApi } from './roles';
export type { Role, RoleDetail, Permission, PermissionsByModule, CreateRoleData, UpdateRoleData } from './roles';

export { organizationsApi } from './organizations';
export type { Organization as OrgType, OrganizationDetail, OrganizationStats, UpdateOrganizationData, SwitchOrganizationResponse } from './organizations';

export { invitationsApi } from './invitations';
export type { Invitation, InvitationDetails, ListInvitationsResponse, SendInvitationData, AcceptInvitationData } from './invitations';

export { notificationsApi } from './notifications';
export type { Notification, ListNotificationsResponse } from './notifications';

export { dashboardApi } from './dashboard';
export type { DashboardStats, RecentActivity, ActivityResponse } from './dashboard';
