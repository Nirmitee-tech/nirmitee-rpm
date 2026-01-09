export { api, api as apiClient } from './client';
export type { ApiError } from './client';

export { authApi } from './auth';
export type { User, Organization, AuthResponse, SignupData, LoginData, LoginResponse } from './auth';

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
export type { DashboardStats, RecentActivity, ActivityResponse, VitalsTrendPoint, VitalsTrendResponse, AlertDistribution, PatientAttention, PatientsAttentionResponse } from './dashboard';

export { billingApi } from './billing';
export type { Plan, Subscription, Invoice, UsageLimits, CheckoutSession, PortalSession, PlansResponse, SubscriptionResponse, InvoicesResponse } from './billing';

export { thresholdsApi } from './thresholds';
export type { VitalType, ThresholdConfig, VitalThreshold, PatientVitalThreshold, SystemDefault, SetThresholdInput, VITAL_TYPE_LABELS, VITAL_TYPE_UNITS } from './thresholds';

export { escalationApi } from './escalation';
export type { AlertSeverity, EscalationReason, EscalationStep, EscalationRule, AlertEscalation, CreateEscalationRuleInput, UpdateEscalationRuleInput, EscalateAlertInput, ROLE_TYPE_LABELS, ESCALATION_REASON_LABELS, SEVERITY_CONFIG } from './escalation';

export { healthRecordsApi } from './health-records';
export type {
  MedicationStatus,
  AllergyType,
  AllergySeverity,
  AllergyStatus,
  ImmunizationStatus,
  LabResultStatus,
  LabInterpretation,
  MedicalHistoryStatus,
  Medication,
  Allergy,
  Immunization,
  LabResult,
  MedicalHistoryItem,
} from './health-records';

export { messagingApi } from './messaging';
export type {
  ConversationStatus,
  MessageType,
  ConversationParticipant,
  Message,
  Conversation,
} from './messaging';

export { alertRulesApi } from './alert-rules';
export type {
  AlertRule,
  AlertCondition,
  AlertConditionLogic,
  AlertConditionOperator,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
  ListAlertRulesParams,
  ListAlertRulesResponse,
} from './alert-rules';

export { assessmentsApi, mapApiTypeToUI, mapUITypeToApi, mapApiStatusToUI } from './assessments';
export type {
  AssessmentType,
  AssessmentStatus,
  Assessment,
  CreateAssessmentInput,
  UpdateAssessmentInput,
  CompleteAssessmentInput,
  ListAssessmentsParams,
  ListAssessmentsResponse,
} from './assessments';

export { patientPortalApi } from './patient-portal';
export type {
  PatientProfile,
  AlertSeverity as PatientAlertSeverity,
  AlertType as PatientAlertType,
  PatientAlert,
  PatientVital,
  CareTeamMember,
  PatientCarePlan,
} from './patient-portal';

export { alertsApi } from './alerts';
export type {
  Alert,
  AlertSeverity as DashboardAlertSeverity,
  AlertStatus,
  AlertType as DashboardAlertType,
  CreateAlertInput,
  ListAlertsParams,
  AlertStats,
  ListAlertsResponse,
} from './alerts';
