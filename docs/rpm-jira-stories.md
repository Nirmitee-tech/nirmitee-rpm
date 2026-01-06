# NirmiteeRPM - Jira Stories & Parallel Execution Plan

**Date**: January 6, 2026
**Agents**: 3 Claude Agents (Agent A, Agent B, Agent C)
**Methodology**: Maximum parallelization with dependency tracking

---

## Execution Overview

### Sprint Timeline (Suggested)

```
SPRINT 1 (Foundation)     SPRINT 2 (Core RPM)      SPRINT 3 (Clinical)      SPRINT 4 (Advanced)
├── Agent A: Database     ├── Agent A: Patients    ├── Agent A: Alerts      ├── Agent A: Billing
├── Agent B: Auth/RBAC    ├── Agent B: Devices     ├── Agent B: Care Plans  ├── Agent B: EHR Int.
└── Agent C: UI Framework └── Agent C: Vitals UI   └── Agent C: Dashboards  └── Agent C: Reports
```

### Dependency Graph

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     FOUNDATION LAYER                         │
                    │  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
                    │  │ Database │  │ Auth/    │  │ UI       │                   │
                    │  │ Schema   │  │ RBAC     │  │ Framework│                   │
                    │  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
                    │       │             │             │                          │
                    └───────┼─────────────┼─────────────┼──────────────────────────┘
                            │             │             │
                    ┌───────▼─────────────▼─────────────▼──────────────────────────┐
                    │                     CORE RPM LAYER                            │
                    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
                    │  │ Patient  │  │ Device   │  │ Vitals   │  │ Care     │     │
                    │  │ Mgmt     │  │ Mgmt     │  │ Tracking │  │ Teams    │     │
                    │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
                    └───────┼─────────────┼─────────────┼─────────────┼────────────┘
                            │             │             │             │
                    ┌───────▼─────────────▼─────────────▼─────────────▼────────────┐
                    │                   CLINICAL LAYER                              │
                    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
                    │  │ Alert    │  │ Care     │  │ Clinical │  │ Caregiver│     │
                    │  │ Engine   │  │ Plans    │  │ Dashboard│  │ Portal   │     │
                    │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
                    └───────┼─────────────┼─────────────┼─────────────┼────────────┘
                            │             │             │             │
                    ┌───────▼─────────────▼─────────────▼─────────────▼────────────┐
                    │                   ADVANCED LAYER                              │
                    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
                    │  │ Billing  │  │ EHR      │  │ Reports  │  │ Analytics│     │
                    │  │ & CPT    │  │ Integr.  │  │ & Export │  │ Dashboard│     │
                    └──────────────────────────────────────────────────────────────┘
```

---

## EPIC 1: Foundation Infrastructure

**Epic ID**: RPM-EPIC-001
**Priority**: P0 - Critical Path
**Must complete before**: All other epics

---

### Story: RPM-001 - Database Schema for Multi-Tenant RPM

**Agent Assignment**: Agent A
**Sprint**: 1
**Story Points**: 8
**Priority**: P0

**Description**:
As a system administrator, I need a robust multi-tenant database schema that supports all RPM entities with proper isolation and relationships.

**Acceptance Criteria**:
- [ ] Create Prisma schema with all core entities
- [ ] Implement organization (tenant) table with settings
- [ ] Create user table with role references
- [ ] Create patient table extending user with medical fields
- [ ] Create vital_readings table with proper indexes
- [ ] Create alerts table with status workflow
- [ ] Create care_plans table with versioning
- [ ] Create devices table with patient linkage
- [ ] Create billing_records table for CPT tracking
- [ ] Create audit_logs table with 6-year retention design
- [ ] Implement Row-Level Security policies for tenant isolation
- [ ] Add database indexes for common query patterns
- [ ] Create seed data for development/testing
- [ ] Generate and run migrations

**Technical Notes**:
```prisma
// Key entities to create:
- Organization (tenant)
- User (base for all roles)
- Patient (extends User)
- Caregiver (extends User)
- CaregiverLink (patient-caregiver relationship)
- Device
- VitalReading
- Alert
- CarePlan
- CarePlanVersion
- BillingRecord
- BillableActivity
- AuditLog
```

**Dependencies**: None (Foundation)
**Blocks**: RPM-004, RPM-007, RPM-010

---

### Story: RPM-002 - Role-Based Access Control (RBAC) System

**Agent Assignment**: Agent B
**Sprint**: 1
**Story Points**: 8
**Priority**: P0

**Description**:
As a security administrator, I need a comprehensive RBAC system that enforces permissions based on user roles and organizational context.

**Acceptance Criteria**:
- [ ] Define 9 user roles with permission sets
- [ ] Create permissions table with granular actions
- [ ] Implement role-permission mapping
- [ ] Create middleware for permission checking
- [ ] Implement organization-scoped access validation
- [ ] Create patient-assignment based access for clinical staff
- [ ] Implement caregiver consent-based access
- [ ] Add permission decorators for API routes
- [ ] Create permission checking utilities for frontend
- [ ] Implement audit logging for access attempts
- [ ] Add MFA requirement flags per role
- [ ] Create role hierarchy validation

**Permission Matrix to Implement**:
```typescript
const ROLES = {
  PATIENT: ['read:own_profile', 'write:vital_readings', 'read:own_alerts', ...],
  CAREGIVER: ['read:linked_patient', 'write:messages', ...],
  CLINICAL_STAFF: ['read:assigned_patients', 'write:clinical_notes', 'write:alerts', ...],
  PHYSICIAN: ['read:all_patients', 'write:care_plans', 'write:orders', ...],
  CARE_COORDINATOR: ['read:assigned_patients', 'write:care_plans', 'write:referrals', ...],
  BILLING_STAFF: ['read:billing_data', 'write:claims', ...],
  PROGRAM_ADMIN: ['read:program_analytics', 'write:program_config', ...],
  IT_ADMIN: ['manage:users', 'manage:integrations', 'read:audit_logs', ...],
  ORG_ADMIN: ['manage:organization', 'read:all_data', ...]
};
```

**Dependencies**: None (Foundation)
**Blocks**: RPM-005, RPM-008, RPM-011

---

### Story: RPM-003 - UI Component Framework for RPM

**Agent Assignment**: Agent C
**Sprint**: 1
**Story Points**: 5
**Priority**: P0

**Description**:
As a frontend developer, I need reusable UI components specific to RPM workflows including vital displays, alert cards, and patient summaries.

**Acceptance Criteria**:
- [ ] Create VitalReadingCard component (displays single reading with status)
- [ ] Create VitalTrendChart component (line chart for trends)
- [ ] Create AlertCard component (with severity colors)
- [ ] Create AlertBadge component (count indicator)
- [ ] Create PatientSummaryCard component
- [ ] Create DeviceStatusIndicator component
- [ ] Create TimeTracker component (for billing)
- [ ] Create HealthStatusIndicator component (green/yellow/red)
- [ ] Create AdherenceCalendar component (16-day tracking)
- [ ] Create CareTeamAvatars component
- [ ] Ensure all components support dark mode
- [ ] Add i18n support to all components
- [ ] Create Storybook documentation

**Component Specifications**:
```tsx
// VitalReadingCard props
interface VitalReadingCardProps {
  type: 'blood_pressure' | 'weight' | 'glucose' | 'oxygen' | 'heart_rate';
  value: Record<string, number>;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  recordedAt: Date;
  trend?: 'up' | 'down' | 'stable';
}

// AlertCard props
interface AlertCardProps {
  severity: 'critical' | 'significant' | 'informational';
  type: 'threshold' | 'trend' | 'adherence';
  patientName: string;
  message: string;
  createdAt: Date;
  onAcknowledge: () => void;
  onEscalate: () => void;
}
```

**Dependencies**: None (Foundation)
**Blocks**: RPM-006, RPM-009, RPM-012

---

## EPIC 2: Patient Management

**Epic ID**: RPM-EPIC-002
**Priority**: P0 - Critical Path
**Depends on**: EPIC 1 (Foundation)

---

### Story: RPM-004 - Patient Registration & Enrollment API

**Agent Assignment**: Agent A
**Sprint**: 2
**Story Points**: 8
**Priority**: P0

**Description**:
As a clinical staff member, I need APIs to register new patients and enroll them in the RPM program with all required medical information.

**Acceptance Criteria**:
- [ ] Create POST /api/patients endpoint for registration
- [ ] Implement patient eligibility validation
- [ ] Create enrollment workflow with status tracking
- [ ] Implement condition assignment (HTN, CHF, DM, COPD)
- [ ] Create insurance information capture
- [ ] Implement consent management
- [ ] Create enrollment date tracking (for CPT 99453)
- [ ] Add care team assignment
- [ ] Implement patient search and filtering
- [ ] Create GET /api/patients/:id endpoint
- [ ] Create PATCH /api/patients/:id for updates
- [ ] Add enrollment status transitions
- [ ] Implement audit logging for patient changes

**API Specifications**:
```typescript
// POST /api/patients
interface CreatePatientRequest {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address: Address;
  conditions: ConditionCode[];
  insurance: InsuranceInfo;
  primaryPhysicianId: string;
  assignedClinicalStaffId?: string;
}

// Enrollment statuses
type EnrollmentStatus = 'pending' | 'consented' | 'device_pending' | 'active' | 'paused' | 'discharged';
```

**Dependencies**: RPM-001 (Database Schema)
**Blocks**: RPM-007, RPM-010, RPM-013

---

### Story: RPM-005 - Patient Enrollment UI Flow

**Agent Assignment**: Agent B
**Sprint**: 2
**Story Points**: 5
**Priority**: P0

**Description**:
As a clinical staff member, I need a step-by-step UI to enroll patients in the RPM program with validation and progress tracking.

**Acceptance Criteria**:
- [ ] Create multi-step enrollment wizard
- [ ] Step 1: Basic patient information form
- [ ] Step 2: Medical conditions selection
- [ ] Step 3: Insurance information
- [ ] Step 4: Care team assignment
- [ ] Step 5: Consent capture (e-signature)
- [ ] Step 6: Device assignment
- [ ] Step 7: Review and confirm
- [ ] Implement form validation with error messages
- [ ] Add progress indicator
- [ ] Create draft saving functionality
- [ ] Add patient search (existing patient check)
- [ ] Implement success confirmation with next steps
- [ ] Add i18n translations

**UI Flow**:
```
[Search Existing] → [Basic Info] → [Conditions] → [Insurance]
                                                       ↓
[Confirmation] ← [Device Setup] ← [Consent] ← [Care Team]
```

**Dependencies**: RPM-002 (RBAC), RPM-003 (UI Components)
**Blocks**: RPM-008, RPM-011

---

### Story: RPM-006 - Patient Mobile App Foundation

**Agent Assignment**: Agent C
**Sprint**: 2
**Story Points**: 8
**Priority**: P0

**Description**:
As a patient, I need a mobile-responsive web app to view my health data, receive notifications, and communicate with my care team.

**Acceptance Criteria**:
- [ ] Create patient-specific layout and navigation
- [ ] Implement patient dashboard with health summary
- [ ] Create vital readings history view
- [ ] Add health trend visualizations
- [ ] Implement alert/notification center
- [ ] Create care team contact section
- [ ] Add educational content section
- [ ] Implement medication reminder display
- [ ] Create settings and preferences page
- [ ] Add PWA manifest for installability
- [ ] Implement offline indicator
- [ ] Add push notification permission request
- [ ] Create i18n support for patient-facing text

**Dashboard Layout**:
```
┌─────────────────────────────────────┐
│  Good Morning, [Name]! 👋           │
│  Last reading: 2 hours ago          │
├─────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐          │
│  │ BP      │  │ Weight  │          │
│  │ 128/82  │  │ 185 lbs │          │
│  │ ✓ Normal│  │ ↓ -2 lbs│          │
│  └─────────┘  └─────────┘          │
├─────────────────────────────────────┤
│  📊 7-Day Trend                     │
│  [Chart visualization]              │
├─────────────────────────────────────┤
│  📬 Messages (2 unread)             │
│  📚 Today's Education               │
└─────────────────────────────────────┘
```

**Dependencies**: RPM-003 (UI Components)
**Blocks**: RPM-009, RPM-015

---

## EPIC 3: Device & Vitals Management

**Epic ID**: RPM-EPIC-003
**Priority**: P0 - Critical Path
**Depends on**: EPIC 2 (Patient Management)

---

### Story: RPM-007 - Device Management API

**Agent Assignment**: Agent A
**Sprint**: 2
**Story Points**: 5
**Priority**: P0

**Description**:
As a clinical staff member, I need APIs to manage patient devices including assignment, status tracking, and troubleshooting.

**Acceptance Criteria**:
- [ ] Create device registry with supported device types
- [ ] Implement POST /api/devices for device registration
- [ ] Create device-patient assignment endpoint
- [ ] Implement device status tracking (active, inactive, error)
- [ ] Create device configuration endpoints
- [ ] Add device firmware version tracking
- [ ] Implement battery/connectivity status
- [ ] Create device replacement workflow
- [ ] Add bulk device import capability
- [ ] Implement device search and filtering
- [ ] Create device troubleshooting log

**Device Types to Support**:
```typescript
type DeviceType =
  | 'blood_pressure_monitor'
  | 'weight_scale'
  | 'pulse_oximeter'
  | 'glucose_monitor'
  | 'cgm'
  | 'thermometer'
  | 'activity_tracker';

interface Device {
  id: string;
  type: DeviceType;
  manufacturer: string;
  model: string;
  serialNumber: string;
  patientId?: string;
  status: 'available' | 'assigned' | 'inactive' | 'maintenance';
  lastSyncAt?: Date;
  batteryLevel?: number;
  firmwareVersion?: string;
}
```

**Dependencies**: RPM-001 (Database), RPM-004 (Patient API)
**Blocks**: RPM-010, RPM-013

---

### Story: RPM-008 - Device Assignment UI

**Agent Assignment**: Agent B
**Sprint**: 2
**Story Points**: 3
**Priority**: P1

**Description**:
As a clinical staff member, I need a UI to assign devices to patients and track device status.

**Acceptance Criteria**:
- [ ] Create device inventory list view
- [ ] Implement device assignment modal
- [ ] Add QR code scanning for device pairing
- [ ] Create device status dashboard
- [ ] Implement device troubleshooting guide
- [ ] Add device replacement workflow UI
- [ ] Create device training checklist
- [ ] Implement device return processing
- [ ] Add device history view per patient

**Dependencies**: RPM-005 (Enrollment UI), RPM-007 (Device API)
**Blocks**: RPM-011

---

### Story: RPM-009 - Vital Reading Submission (Patient)

**Agent Assignment**: Agent C
**Sprint**: 2
**Story Points**: 5
**Priority**: P0

**Description**:
As a patient, I need to submit my vital readings either automatically via device or manually through the app.

**Acceptance Criteria**:
- [ ] Create manual vital entry form for each type
- [ ] Implement blood pressure entry (systolic, diastolic, pulse)
- [ ] Create weight entry with unit conversion
- [ ] Implement blood glucose entry with meal context
- [ ] Create oxygen saturation entry
- [ ] Add symptom logging with predefined options
- [ ] Implement reading timestamp selection
- [ ] Create confirmation with status feedback
- [ ] Add quick-entry for repeat readings
- [ ] Implement validation with range checking
- [ ] Create reading history with edit capability
- [ ] Add device sync status indicator

**Manual Entry Form**:
```
┌─────────────────────────────────────┐
│  Record Blood Pressure              │
├─────────────────────────────────────┤
│  Systolic (mmHg)                    │
│  ┌─────────────────────────────┐    │
│  │ 128                         │    │
│  └─────────────────────────────┘    │
│                                     │
│  Diastolic (mmHg)                   │
│  ┌─────────────────────────────┐    │
│  │ 82                          │    │
│  └─────────────────────────────┘    │
│                                     │
│  Pulse (bpm)                        │
│  ┌─────────────────────────────┐    │
│  │ 72                          │    │
│  └─────────────────────────────┘    │
│                                     │
│  📅 Now  or  Select time            │
│                                     │
│  [Cancel]           [Save Reading]  │
└─────────────────────────────────────┘
```

**Dependencies**: RPM-006 (Patient App), RPM-003 (UI Components)
**Blocks**: RPM-012, RPM-016

---

### Story: RPM-010 - Vital Reading Ingestion API

**Agent Assignment**: Agent A
**Sprint**: 2
**Story Points**: 8
**Priority**: P0

**Description**:
As the system, I need APIs to receive, validate, and store vital readings from devices and manual entry with automatic alert generation.

**Acceptance Criteria**:
- [ ] Create POST /api/vitals endpoint for reading submission
- [ ] Implement device data ingestion webhook
- [ ] Add reading validation (range, duplicates)
- [ ] Create threshold checking logic
- [ ] Implement automatic alert generation
- [ ] Add data normalization (unit conversion)
- [ ] Create batch import for device sync
- [ ] Implement reading aggregation (daily averages)
- [ ] Add reading history endpoints with pagination
- [ ] Create trend calculation logic
- [ ] Implement data retention policies
- [ ] Add FHIR Observation mapping

**Threshold Configuration**:
```typescript
interface VitalThreshold {
  vitalType: VitalType;
  condition: ConditionCode;
  critical: { min?: number; max?: number };
  warning: { min?: number; max?: number };
  // Example for Blood Pressure (systolic)
  // critical: { max: 180 }, warning: { max: 140 }
}
```

**Dependencies**: RPM-001 (Database), RPM-004 (Patient), RPM-007 (Device)
**Blocks**: RPM-013, RPM-016, RPM-019

---

## EPIC 4: Alert & Clinical Workflow

**Epic ID**: RPM-EPIC-004
**Priority**: P0 - Critical Path
**Depends on**: EPIC 3 (Device & Vitals)

---

### Story: RPM-011 - Alert Management API

**Agent Assignment**: Agent B
**Sprint**: 3
**Story Points**: 8
**Priority**: P0

**Description**:
As a clinical staff member, I need APIs to manage alerts including viewing, acknowledging, escalating, and resolving with full audit trail.

**Acceptance Criteria**:
- [ ] Create GET /api/alerts endpoint with filtering
- [ ] Implement alert priority sorting (critical first)
- [ ] Add alert assignment to clinical staff
- [ ] Create alert acknowledgment endpoint
- [ ] Implement alert escalation to physician
- [ ] Add alert resolution with outcome
- [ ] Create alert statistics endpoint
- [ ] Implement alert snooze functionality
- [ ] Add real-time alert WebSocket events
- [ ] Create alert audit trail
- [ ] Implement workload balancing logic
- [ ] Add alert de-duplication

**Alert Workflow States**:
```
new → acknowledged → (escalated) → resolved
         ↓
       snoozed → new (after snooze expires)
```

**Dependencies**: RPM-002 (RBAC), RPM-010 (Vitals)
**Blocks**: RPM-014, RPM-017

---

### Story: RPM-012 - Clinical Staff Dashboard

**Agent Assignment**: Agent C
**Sprint**: 3
**Story Points**: 8
**Priority**: P0

**Description**:
As a clinical staff member, I need a dashboard to view all assigned patients, alerts, and pending tasks in a prioritized manner.

**Acceptance Criteria**:
- [ ] Create dashboard layout with key metrics
- [ ] Implement alert queue with priority sorting
- [ ] Add patient list with status indicators
- [ ] Create quick-action buttons (call, message, view)
- [ ] Implement workload summary
- [ ] Add today's tasks/follow-ups
- [ ] Create patient search and filtering
- [ ] Implement real-time alert updates (WebSocket)
- [ ] Add shift handoff view
- [ ] Create documentation queue
- [ ] Implement time tracking widget
- [ ] Add i18n translations

**Dashboard Layout**:
```
┌────────────────────────────────────────────────────────────────────┐
│  Clinical Dashboard                           [Shift: Day] [👤 RN] │
├───────────────┬────────────────────────────────────────────────────┤
│  ALERTS       │  PATIENT QUEUE                                     │
│  ─────────    │  ────────────────────────────────────────────────  │
│  🔴 Critical 3│  [Search patients...]                              │
│  🟠 Signif.  12│                                                   │
│  🔵 Info     28│  ┌──────────────────────────────────────────────┐ │
│               │  │ 🔴 John D. - BP 185/110 - 5 min ago          │ │
│  [View All]   │  │    CHF | Last contact: 2 days ago            │ │
│               │  │    [Call] [Message] [View] [Escalate]        │ │
├───────────────┤  └──────────────────────────────────────────────┘ │
│  MY STATS     │  ┌──────────────────────────────────────────────┐ │
│  ─────────    │  │ 🟠 Mary S. - Weight +4 lbs (3 days)         │ │
│  Patients: 48 │  │    CHF | Trending concern                    │ │
│  Resolved: 15 │  │    [Call] [Message] [View]                   │ │
│  Pending:  8  │  └──────────────────────────────────────────────┘ │
│               │                                                    │
│  ⏱️ Time: 2:15│  [Load more...]                                   │
└───────────────┴────────────────────────────────────────────────────┘
```

**Dependencies**: RPM-003 (UI), RPM-008 (Device UI), RPM-009 (Vitals UI)
**Blocks**: RPM-015, RPM-018

---

### Story: RPM-013 - Care Plan Management API

**Agent Assignment**: Agent A
**Sprint**: 3
**Story Points**: 8
**Priority**: P0

**Description**:
As a physician, I need APIs to create, update, and version care plans with condition-specific protocols and thresholds.

**Acceptance Criteria**:
- [ ] Create POST /api/care-plans endpoint
- [ ] Implement care plan versioning
- [ ] Add condition-specific templates
- [ ] Create threshold configuration per patient
- [ ] Implement medication list management
- [ ] Add care goals with progress tracking
- [ ] Create care plan approval workflow
- [ ] Implement care plan sharing with patient
- [ ] Add care plan history endpoint
- [ ] Create care plan comparison view
- [ ] Implement care plan expiration alerts
- [ ] Add FHIR CarePlan mapping

**Care Plan Structure**:
```typescript
interface CarePlan {
  id: string;
  patientId: string;
  version: number;
  status: 'draft' | 'pending_approval' | 'active' | 'expired';
  conditions: {
    code: ConditionCode;
    thresholds: VitalThreshold[];
    goals: CareGoal[];
    interventions: Intervention[];
  }[];
  medications: Medication[];
  monitoringSchedule: {
    vitalType: VitalType;
    frequency: 'daily' | 'twice_daily' | 'weekly';
  }[];
  effectiveDate: Date;
  expirationDate?: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
}
```

**Dependencies**: RPM-004 (Patient), RPM-010 (Vitals)
**Blocks**: RPM-016, RPM-019

---

### Story: RPM-014 - Caregiver Portal

**Agent Assignment**: Agent B
**Sprint**: 3
**Story Points**: 5
**Priority**: P1

**Description**:
As a caregiver, I need a portal to view my linked patient's health status and communicate with the care team.

**Acceptance Criteria**:
- [ ] Create caregiver dashboard
- [ ] Implement patient linking with consent
- [ ] Add configurable alert preferences
- [ ] Create vitals viewing (read-only)
- [ ] Implement care team messaging
- [ ] Add educational resources
- [ ] Create escalation button
- [ ] Implement notification preferences
- [ ] Add caregiver profile management
- [ ] Create activity log for caregiver actions

**Consent Flow**:
```
Patient grants access → Caregiver receives invite →
Caregiver accepts → Access granted →
Caregiver configures preferences
```

**Dependencies**: RPM-002 (RBAC), RPM-005 (Enrollment UI)
**Blocks**: RPM-017

---

### Story: RPM-015 - Physician Review Dashboard

**Agent Assignment**: Agent C
**Sprint**: 3
**Story Points**: 5
**Priority**: P0

**Description**:
As a physician, I need a dashboard to review escalated alerts, approve care plan changes, and track billable time.

**Acceptance Criteria**:
- [ ] Create physician-specific dashboard
- [ ] Implement escalation queue
- [ ] Add patient summary cards
- [ ] Create care plan approval workflow UI
- [ ] Implement time tracking display
- [ ] Add one-click video call launch
- [ ] Create order entry interface
- [ ] Implement supervision oversight view
- [ ] Add billable time summary
- [ ] Create quick documentation templates

**Dashboard Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Provider Dashboard                    ⏱️ Billable: 45 min today │
├─────────────────────────────────────────────────────────────────┤
│  NEEDS YOUR ATTENTION (3)                                        │
│  ────────────────────────────────────────────────────────────── │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🔴 Escalated: John D. - Critical BP (185/110)            │  │
│  │    Nurse notes: Patient reports headache, took medication │  │
│  │    [Review Details] [Call Patient] [Approve Plan Change]  │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  CARE PLAN APPROVALS (2)                                         │
├─────────────────────────────────────────────────────────────────┤
│  MONTHLY REVIEWS DUE (5)                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Dependencies**: RPM-012 (Clinical Dashboard), RPM-006 (Patient App)
**Blocks**: RPM-018, RPM-020

---

## EPIC 5: Billing & Compliance

**Epic ID**: RPM-EPIC-005
**Priority**: P0 - Critical Path
**Depends on**: EPIC 4 (Clinical Workflow)

---

### Story: RPM-016 - Billing Time Tracking API

**Agent Assignment**: Agent A
**Sprint**: 4
**Story Points**: 8
**Priority**: P0

**Description**:
As the system, I need to automatically track billable time for provider interactions to support CPT 99457/99458 billing.

**Acceptance Criteria**:
- [ ] Create time tracking service
- [ ] Implement automatic call duration capture
- [ ] Add video consultation time logging
- [ ] Create activity classification (billable vs non-billable)
- [ ] Implement monthly aggregation
- [ ] Add CPT code recommendation engine
- [ ] Create 16-day data transmission tracking
- [ ] Implement billing eligibility validation
- [ ] Add time correction/adjustment capability
- [ ] Create billing summary endpoints
- [ ] Implement audit trail for time entries

**Billable Activity Classification**:
```typescript
interface TimeEntry {
  id: string;
  patientId: string;
  providerId: string;
  activityType: 'phone_call' | 'video_call' | 'chart_review' | 'care_planning' | 'documentation';
  duration: number; // minutes
  isBillable: boolean;
  cptCodeSuggestion?: '99457' | '99458' | '99470';
  startTime: Date;
  endTime: Date;
  notes?: string;
}

// Monthly aggregation
interface MonthlyBillingSummary {
  patientId: string;
  month: string; // "2026-01"
  dataTransmissionDays: number; // for 99454
  totalBillableMinutes: number;
  eligibleCodes: {
    '99453': boolean; // setup
    '99454': boolean; // 16+ days
    '99457': boolean; // 20+ min
    '99458': number;  // count of additional 20-min
  };
}
```

**Dependencies**: RPM-010 (Vitals), RPM-013 (Care Plans)
**Blocks**: RPM-019, RPM-022

---

### Story: RPM-017 - Billing Dashboard UI

**Agent Assignment**: Agent B
**Sprint**: 4
**Story Points**: 5
**Priority**: P0

**Description**:
As a billing staff member, I need a dashboard to review billing eligibility, generate claims, and track revenue.

**Acceptance Criteria**:
- [ ] Create billing overview dashboard
- [ ] Implement patient billing status list
- [ ] Add 16-day calendar visualization
- [ ] Create time verification interface
- [ ] Implement CPT code selection UI
- [ ] Add pre-claim validation checklist
- [ ] Create claim generation workflow
- [ ] Implement denial tracking
- [ ] Add revenue analytics charts
- [ ] Create billing audit log view

**Billing Dashboard**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Billing Dashboard - January 2026                                │
├─────────────────────────────────────────────────────────────────┤
│  READY TO BILL (45)    PENDING (12)    DENIED (3)               │
├─────────────────────────────────────────────────────────────────┤
│  Patient: John D.                                                │
│  ├── 99454: ✅ Eligible (18 days data)                          │
│  ├── 99457: ✅ Eligible (32 min recorded)                       │
│  └── 99458: ✅ Eligible (12 additional min)                     │
│  [Generate Claim]                                                │
├─────────────────────────────────────────────────────────────────┤
│  Data Transmission Calendar                                      │
│  [■][■][■][□][■][■][■] [■][■][□][■][■][■][■] ...               │
│   1  2  3  4  5  6  7   8  9 10 11 12 13 14                     │
│  ■ = Data received  □ = No data                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Dependencies**: RPM-014 (Caregiver), RPM-011 (Alerts)
**Blocks**: RPM-020

---

### Story: RPM-018 - Program Analytics Dashboard

**Agent Assignment**: Agent C
**Sprint**: 4
**Story Points**: 8
**Priority**: P1

**Description**:
As a program administrator, I need analytics dashboards to monitor program performance, outcomes, and compliance.

**Acceptance Criteria**:
- [ ] Create program KPI dashboard
- [ ] Implement patient cohort analytics
- [ ] Add enrollment trend charts
- [ ] Create outcome tracking (readmissions, ED visits)
- [ ] Implement staff workload analytics
- [ ] Add alert resolution metrics
- [ ] Create adherence rate tracking
- [ ] Implement revenue per patient metrics
- [ ] Add compliance score dashboard
- [ ] Create exportable reports
- [ ] Implement date range filtering
- [ ] Add benchmark comparisons

**KPIs to Display**:
```
- Total enrolled patients
- Active vs. paused patients
- Average adherence rate
- Alert resolution time (avg)
- Escalation rate
- 30-day readmission rate
- Revenue per patient per month
- Staff utilization rate
- Billing accuracy rate
- Patient satisfaction score
```

**Dependencies**: RPM-012 (Clinical Dashboard), RPM-015 (Physician Dashboard)
**Blocks**: RPM-021

---

## EPIC 6: EHR Integration

**Epic ID**: RPM-EPIC-006
**Priority**: P1 - High
**Depends on**: EPIC 4 (Clinical Workflow)

---

### Story: RPM-019 - FHIR Integration Framework

**Agent Assignment**: Agent A
**Sprint**: 4
**Story Points**: 13
**Priority**: P1

**Description**:
As the system, I need a FHIR-compliant integration framework to exchange data with EHR systems bidirectionally.

**Acceptance Criteria**:
- [ ] Create FHIR client library
- [ ] Implement Patient resource mapping
- [ ] Add Observation resource for vitals (push to EHR)
- [ ] Create Condition resource sync (pull from EHR)
- [ ] Implement MedicationStatement sync
- [ ] Add CarePlan resource mapping
- [ ] Create Practitioner resource sync
- [ ] Implement OAuth 2.0 for SMART on FHIR
- [ ] Add webhook handlers for EHR events
- [ ] Create integration health monitoring
- [ ] Implement retry logic with exponential backoff
- [ ] Add integration audit logging

**FHIR Resources to Support**:
```typescript
// Outbound (NirmiteeRPM → EHR)
- Observation (vital signs)
- DocumentReference (clinical notes summary)

// Inbound (EHR → NirmiteeRPM)
- Patient (demographics)
- Condition (problem list)
- MedicationStatement (medications)
- AllergyIntolerance
- Practitioner (care team)

// Bidirectional
- CarePlan
- Goal
```

**Dependencies**: RPM-010 (Vitals), RPM-013 (Care Plans)
**Blocks**: RPM-022

---

### Story: RPM-020 - EHR Integration Settings UI

**Agent Assignment**: Agent B
**Sprint**: 4
**Story Points**: 5
**Priority**: P1

**Description**:
As an IT administrator, I need a UI to configure EHR integrations, monitor sync status, and troubleshoot issues.

**Acceptance Criteria**:
- [ ] Create EHR connection wizard
- [ ] Implement OAuth authorization flow UI
- [ ] Add sync configuration settings
- [ ] Create integration health dashboard
- [ ] Implement error log viewer
- [ ] Add manual sync trigger
- [ ] Create field mapping configuration
- [ ] Implement test connection functionality
- [ ] Add sync schedule configuration
- [ ] Create integration audit log

**Dependencies**: RPM-015 (Physician Dashboard), RPM-017 (Billing Dashboard)
**Blocks**: None

---

### Story: RPM-021 - Reports & Export

**Agent Assignment**: Agent C
**Sprint**: 4
**Story Points**: 5
**Priority**: P1

**Description**:
As a program administrator, I need to generate and export reports for compliance, board presentations, and analysis.

**Acceptance Criteria**:
- [ ] Create report builder interface
- [ ] Implement pre-defined report templates
- [ ] Add custom date range selection
- [ ] Create PDF export functionality
- [ ] Implement CSV export for data analysis
- [ ] Add scheduled report delivery
- [ ] Create report sharing functionality
- [ ] Implement compliance report template
- [ ] Add financial summary report
- [ ] Create patient outcome report

**Report Types**:
```
- Monthly Program Summary
- Billing Compliance Report
- Patient Adherence Report
- Clinical Outcomes Report
- Staff Productivity Report
- Alert Analytics Report
- Revenue Summary Report
```

**Dependencies**: RPM-018 (Program Analytics)
**Blocks**: None

---

### Story: RPM-022 - Audit Logging & Compliance

**Agent Assignment**: Agent A
**Sprint**: 4
**Story Points**: 5
**Priority**: P0

**Description**:
As a compliance officer, I need comprehensive audit logging for all system activities with HIPAA-compliant retention.

**Acceptance Criteria**:
- [ ] Create audit log service
- [ ] Implement user action logging
- [ ] Add PHI access logging
- [ ] Create login/logout event capture
- [ ] Implement configuration change logging
- [ ] Add billing action audit trail
- [ ] Create audit log search interface
- [ ] Implement 6-year retention policy
- [ ] Add audit log export for compliance
- [ ] Create access pattern anomaly detection

**Audit Log Schema**:
```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  organizationId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  patientId?: string; // if PHI involved
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  outcome: 'success' | 'failure';
}
```

**Dependencies**: RPM-016 (Billing)
**Blocks**: None

---

## Parallel Execution Matrix

### Sprint 1: Foundation (Week 1-2)

| Agent A | Agent B | Agent C |
|---------|---------|---------|
| RPM-001: Database Schema | RPM-002: RBAC System | RPM-003: UI Components |
| (8 points) | (8 points) | (5 points) |

**Sync Point**: End of Sprint 1 - All foundation complete

---

### Sprint 2: Core RPM (Week 3-4)

| Agent A | Agent B | Agent C |
|---------|---------|---------|
| RPM-004: Patient API | RPM-005: Enrollment UI | RPM-006: Patient Mobile |
| (8 points) | (5 points) | (8 points) |
| RPM-007: Device API | RPM-008: Device UI | RPM-009: Vital Entry UI |
| (5 points) | (3 points) | (5 points) |
| RPM-010: Vitals API | - | - |
| (8 points) | | |

**Sync Point**: End of Sprint 2 - Core patient/vitals flow complete

---

### Sprint 3: Clinical Workflow (Week 5-6)

| Agent A | Agent B | Agent C |
|---------|---------|---------|
| RPM-013: Care Plan API | RPM-011: Alert API | RPM-012: Clinical Dashboard |
| (8 points) | (8 points) | (8 points) |
| - | RPM-014: Caregiver Portal | RPM-015: Physician Dashboard |
| | (5 points) | (5 points) |

**Sync Point**: End of Sprint 3 - Full clinical workflow complete

---

### Sprint 4: Advanced Features (Week 7-8)

| Agent A | Agent B | Agent C |
|---------|---------|---------|
| RPM-016: Billing API | RPM-017: Billing Dashboard | RPM-018: Analytics Dashboard |
| (8 points) | (5 points) | (8 points) |
| RPM-019: FHIR Integration | RPM-020: EHR Settings UI | RPM-021: Reports & Export |
| (13 points) | (5 points) | (5 points) |
| RPM-022: Audit Logging | - | - |
| (5 points) | | |

**Sync Point**: End of Sprint 4 - MVP Complete

---

## Story Summary

| Sprint | Agent A | Agent B | Agent C | Total |
|--------|---------|---------|---------|-------|
| Sprint 1 | 8 pts | 8 pts | 5 pts | 21 pts |
| Sprint 2 | 21 pts | 8 pts | 13 pts | 42 pts |
| Sprint 3 | 8 pts | 13 pts | 13 pts | 34 pts |
| Sprint 4 | 26 pts | 10 pts | 13 pts | 49 pts |
| **Total** | **63 pts** | **39 pts** | **44 pts** | **146 pts** |

---

## Quick Reference: Story Dependencies

```
RPM-001 ─┬→ RPM-004 ─┬→ RPM-007 → RPM-010 → RPM-013 → RPM-016 → RPM-019
         │           │                              ↓        ↓
         │           └→ RPM-010 ───────────────→ RPM-016 → RPM-022
         │
RPM-002 ─┼→ RPM-005 → RPM-008 → RPM-011 → RPM-014 → RPM-017
         │                              ↓
         │                         RPM-015 → RPM-020
         │
RPM-003 ─┴→ RPM-006 → RPM-009 → RPM-012 → RPM-015 → RPM-018 → RPM-021
```

---

## Execution Commands

### Start Sprint 1 (Parallel)
```bash
# Agent A
claude --task "Implement RPM-001: Database Schema" --context ./docs/rpm-jira-stories.md

# Agent B
claude --task "Implement RPM-002: RBAC System" --context ./docs/rpm-jira-stories.md

# Agent C
claude --task "Implement RPM-003: UI Components" --context ./docs/rpm-jira-stories.md
```

### Start Sprint 2 (After Sprint 1 sync)
```bash
# Agent A
claude --task "Implement RPM-004, RPM-007, RPM-010" --context ./docs/rpm-jira-stories.md

# Agent B
claude --task "Implement RPM-005, RPM-008" --context ./docs/rpm-jira-stories.md

# Agent C
claude --task "Implement RPM-006, RPM-009" --context ./docs/rpm-jira-stories.md
```

---

**Document Status**: Ready for Implementation
**Created**: January 6, 2026
