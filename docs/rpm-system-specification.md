# NirmiteeRPM - System Specification

**Version**: 1.0
**Date**: January 6, 2026
**Status**: Draft for Review

---

## 1. Executive Summary

NirmiteeRPM is an open-source Remote Patient Monitoring platform designed to serve healthcare organizations from small clinics to large health systems. The platform uses a **centralized monitoring model** with full EHR bi-directional sync, supporting multiple chronic conditions.

### Key Differentiators
- Open source (MIT license) - no vendor lock-in
- Multi-tenant architecture scaling from 1 to 1000+ organizations
- CMS 2026 billing compliance built-in (CPT 99453, 99454, 99457, 99458, 99470, 99445)
- AI-powered alert prioritization to combat alert fatigue
- Full FHIR/HL7 EHR integration

---

## 2. User Roles & Personas

### 2.1 Role Hierarchy

```
Organization Admin (Org Owner)
    ├── IT Administrator
    ├── Program Administrator
    │       ├── Billing Staff
    │       └── Care Coordinator
    │               └── Clinical Staff (Nurses/MAs)
    │                       └── Physician
    └── Patient
            └── Caregiver (linked)
```

### 2.2 Detailed Role Definitions

---

#### ROLE: Patient

**Who**: Individuals with chronic conditions enrolled in RPM program

**Conditions Supported**:
- Cardiovascular: Hypertension (HTN), Heart Failure (CHF), Arrhythmia
- Metabolic: Diabetes Type 1/2, Pre-diabetes, Obesity
- Respiratory: COPD, Asthma, Post-COVID monitoring
- Other: Chronic Kidney Disease, Post-surgical recovery

**Responsibilities**:
| Task | Frequency | Required |
|------|-----------|----------|
| Record vital signs via device | Daily | Yes (16+ days/month for billing) |
| Log symptoms in app | As needed | Recommended |
| Respond to care team messages | Within 24h | Yes |
| Attend scheduled video consultations | Monthly minimum | Yes (for CPT 99457) |
| Complete medication adherence tracking | Daily | Recommended |
| Review educational content | Weekly | Recommended |

**System Expectations**:
- Simple mobile app (iOS/Android) with large buttons
- Auto-sync devices (no manual data entry when possible)
- Clear visual feedback on readings (green/yellow/red)
- Instant alerts when action needed
- Direct messaging with care team
- Educational content for their condition(s)

**Pain Points Solved**:
| Problem | Solution |
|---------|----------|
| Device complexity | Interactive setup wizard, video tutorials |
| "What do my numbers mean?" | Real-time feedback with context |
| "When should I worry?" | Clear escalation guidance, color-coded alerts |
| Medication forgetfulness | Smart reminders, adherence tracking |
| Feeling isolated | Care team messaging, community support |

**Key Metrics**:
- Adherence rate (% of expected readings submitted)
- Health trend (improving/stable/declining)
- Response time to care team
- Educational content engagement

**Permissions**:
```
patient:
  read:
    - own_profile
    - own_vitals
    - own_alerts
    - own_care_plan (view only)
    - own_messages
    - educational_content
  write:
    - own_profile (limited fields)
    - vital_readings
    - symptom_logs
    - messages_to_care_team
  cannot:
    - view_other_patients
    - modify_care_plan
    - access_billing
    - access_clinical_notes (full)
```

---

#### ROLE: Caregiver

**Who**: Family members, spouses, or designated individuals supporting a patient

**Relationship Types**:
- Spouse/Partner
- Adult Child
- Parent
- Sibling
- Professional Caregiver
- Legal Guardian

**Responsibilities**:
| Task | Description |
|------|-------------|
| Assist with device usage | Help patient measure and submit vitals |
| Monitor patient status | Review dashboard for linked patient(s) |
| Escalate concerns | Contact care team when patient can't |
| Support medication adherence | Remind and verify patient compliance |
| Coordinate care logistics | Appointments, transportation, equipment |

**System Expectations**:
- Dashboard showing linked patient(s) status
- Configurable alert preferences (what/when to notify)
- Direct messaging with care team
- Educational resources for supporting patient
- Emergency contact integration

**Pain Points Solved**:
| Problem | Solution |
|---------|----------|
| Alert overload | Smart filtering, configurable thresholds |
| "When to call doctor?" | Clear escalation criteria, one-tap contact |
| No visibility into care | Shared dashboard with patient permission |
| Caregiver burnout | Workload delegation to clinical staff |

**Permissions**:
```
caregiver:
  read:
    - own_profile
    - linked_patient_vitals (with patient consent)
    - linked_patient_alerts (configurable)
    - linked_patient_care_plan (summary view)
    - linked_patient_messages (with consent)
    - educational_content
  write:
    - own_profile
    - messages_to_care_team
    - vital_readings (on behalf of patient)
  cannot:
    - access_unlinked_patients
    - modify_care_plan
    - view_clinical_notes
    - access_billing
```

**Consent Model**:
- Patient must explicitly grant caregiver access
- Patient can revoke access at any time
- Granular permissions (vitals only, alerts, messages)
- Audit log of caregiver access

---

#### ROLE: Clinical Staff (Nurses, Medical Assistants)

**Who**: RNs, LPNs, MAs, Clinical Coordinators in the RPM program

**Responsibilities**:
| Task | Frequency | Billable |
|------|-----------|----------|
| Review patient dashboard | Multiple times daily | No |
| Triage alerts by priority | As alerts occur | No |
| Contact patients (coaching, education) | As needed | No* |
| Document clinical assessments | After each interaction | Yes (supports 99457) |
| Escalate to physician | When thresholds met | Yes |
| Patient onboarding & device training | Per enrollment | Yes (99453) |
| Follow up on non-adherence | Daily | No |

*Nursing time supports physician billing but is not independently billable

**System Expectations**:
- Real-time dashboard showing all assigned patients
- Smart alert prioritization (critical → significant → informational)
- One-click patient contact (call, message, video)
- Quick documentation templates
- EHR integration for full patient context
- Workload management visibility

**Pain Points Solved**:
| Problem | Solution |
|---------|----------|
| Alert fatigue (100+/day) | AI prioritization, smart thresholds, batch processing |
| Time-consuming data review | Auto-summary, trend highlights, exception-based review |
| No clinical context | EHR integration, medication list, problem list visible |
| Poor provider coordination | Structured escalation, provider feedback loop |
| Inconsistent documentation | Standardized templates, required fields |
| Workload overload | Capacity management, automatic load balancing |

**Key Metrics**:
- Alerts resolved within SLA
- Patient contact rate
- Escalation accuracy (% appropriate)
- Documentation completeness
- Patient adherence improvement

**Permissions**:
```
clinical_staff:
  read:
    - own_profile
    - assigned_patients (all data)
    - patient_vitals
    - patient_alerts
    - patient_care_plans
    - clinical_notes
    - patient_messages
    - ehr_integrated_data
  write:
    - clinical_notes
    - alert_assessments
    - patient_messages
    - escalation_requests
    - device_orders
  cannot:
    - modify_care_plans (physician only)
    - approve_treatment_changes
    - access_billing_details
    - manage_users
    - view_audit_logs
```

---

#### ROLE: Physician/Provider

**Who**: MDs, DOs, NPs, PAs responsible for clinical decisions

**Responsibilities**:
| Task | Frequency | Billable |
|------|-----------|----------|
| Order RPM for eligible patients | Per patient | No |
| Review escalated alerts | As escalated | Yes |
| Conduct synchronous interactions | Monthly (20+ min) | Yes (99457/99458) |
| Approve care plan changes | As needed | Yes |
| Provide supervision to clinical staff | Ongoing | Implicit |
| Sign off on clinical notes | As required | No |

**System Expectations**:
- Executive summary dashboard (not overwhelming)
- Only urgent items requiring action surfaced
- Automatic time tracking for billing
- EHR-embedded or seamless SSO access
- Mobile access for on-call scenarios
- Clear supervision/accountability trail

**Pain Points Solved**:
| Problem | Solution |
|---------|----------|
| Information overload | Filtered view, AI-prioritized summaries |
| Fragmented data | Full EHR integration, unified patient view |
| Time tracking for billing | Automatic logging during interactions |
| Chart review time | Auto-generated clinical summaries |
| Remote access | Mobile app, secure anywhere access |

**Key Metrics**:
- Billable time captured (99457/99458/99470)
- Patient outcomes (readmissions, ED visits)
- Escalation response time
- Care plan effectiveness

**Permissions**:
```
physician:
  read:
    - own_profile
    - all_patients_in_org (or assigned panel)
    - patient_vitals
    - patient_alerts
    - patient_care_plans
    - clinical_notes
    - billing_summary
    - ehr_data
  write:
    - clinical_notes
    - care_plans (full modify)
    - medication_orders
    - treatment_decisions
    - escalation_responses
    - supervision_approvals
  cannot:
    - manage_users
    - access_full_billing
    - modify_system_config
```

---

#### ROLE: Care Coordinator/Case Manager

**Who**: Professionals managing complex patients across multiple services

**Responsibilities**:
| Task | Description |
|------|-------------|
| Complex patient assessment | Identify high-risk patients for intensive management |
| Multi-specialty coordination | Coordinate between PCP, specialists, hospital |
| Care plan development | Create and update comprehensive care plans |
| Transition management | Hospital discharge, specialty handoffs |
| Resource navigation | Social services, equipment, insurance |
| Outcome tracking | Monitor and report on patient outcomes |

**System Expectations**:
- Risk stratification dashboard
- Multi-provider coordination tools
- Care plan templates and tracking
- Referral management integration
- Outcome measurement dashboards
- Insurance eligibility tools

**Permissions**:
```
care_coordinator:
  read:
    - own_profile
    - assigned_complex_patients
    - patient_vitals
    - patient_alerts
    - care_plans (all versions)
    - clinical_notes
    - referral_data
    - insurance_eligibility
  write:
    - care_plans
    - referrals
    - care_coordination_notes
    - resource_orders
    - patient_messages
  cannot:
    - modify_medications
    - approve_clinical_orders
    - access_billing
```

---

#### ROLE: Billing Staff

**Who**: Billing specialists, coders, revenue cycle staff

**Responsibilities**:
| Task | Frequency |
|------|-----------|
| Verify billing eligibility | Daily |
| Generate claims (99453, 99454, 99457, 99458) | Monthly |
| Submit claims to payers | Weekly |
| Manage denials and appeals | As needed |
| Audit documentation completeness | Ongoing |
| Report on revenue metrics | Weekly/Monthly |

**System Expectations**:
- Automatic time tracking for CPT 99457/99458
- 16-day data verification for CPT 99454
- CPT code recommendations based on activities
- Pre-claim compliance validation
- Payer integration for eligibility
- Denial analytics and trending

**Pain Points Solved**:
| Problem | Solution |
|---------|----------|
| Manual time tracking | Automatic interaction logging |
| 16-day verification | Visual calendar, auto-calculation |
| CPT code errors | Smart recommendations, validation |
| Missing documentation | Completion checklists, alerts |
| High denial rates | Pre-submission validation, payer rules |

**Key Metrics**:
- Billing accuracy rate
- First-pass claim acceptance
- Days to payment
- Revenue per patient per month
- Denial rate by reason

**Permissions**:
```
billing_staff:
  read:
    - own_profile
    - patient_billing_data
    - documentation_status
    - claim_history
    - payment_records
    - denial_reports
  write:
    - claims
    - billing_codes
    - payment_postings
    - denial_appeals
  cannot:
    - access_clinical_notes (content)
    - access_patient_vitals (details)
    - modify_care_plans
    - manage_users
```

---

#### ROLE: Program Administrator

**Who**: Clinical program managers, operations leaders

**Responsibilities**:
| Task | Description |
|------|-------------|
| Program design | Define workflows, protocols, thresholds |
| Staffing management | Schedule staff, manage capacity |
| Quality oversight | Monitor outcomes, compliance, satisfaction |
| Performance reporting | KPI dashboards, board reports |
| Vendor management | Device vendors, integration partners |
| Training & competency | Staff education, certification tracking |

**System Expectations**:
- Program-wide KPI dashboards
- Patient cohort analytics
- Staff workload reports
- Compliance tracking
- Predictive analytics for planning
- Exportable reports for leadership

**Permissions**:
```
program_admin:
  read:
    - all_program_data (aggregated)
    - patient_rosters
    - staff_performance
    - compliance_reports
    - financial_metrics
    - audit_logs (program level)
  write:
    - program_configuration
    - workflow_definitions
    - alert_thresholds (defaults)
    - staff_assignments
    - reports
  cannot:
    - access_individual_patient_records (unless needed)
    - modify_billing
    - manage_organization_settings
```

---

#### ROLE: IT Administrator

**Who**: System admins, security engineers

**Responsibilities**:
| Task | Description |
|------|-------------|
| User provisioning | Create/deactivate accounts, assign roles |
| Security management | MFA, access controls, password policies |
| Integration management | EHR connections, device APIs |
| System monitoring | Uptime, performance, errors |
| Compliance | HIPAA audits, security assessments |
| Backup/DR | Data protection, recovery procedures |

**System Expectations**:
- Admin console for user management
- RBAC configuration tools
- Integration health dashboards
- Audit log access
- Security event monitoring
- API key management

**Permissions**:
```
it_admin:
  read:
    - own_profile
    - user_accounts
    - system_configuration
    - integration_status
    - audit_logs (all)
    - security_events
  write:
    - user_accounts
    - role_assignments
    - security_settings
    - integration_configs
    - api_keys
  cannot:
    - access_patient_data (PHI)
    - access_clinical_notes
    - access_billing
```

---

#### ROLE: Organization Administrator

**Who**: Clinic owners, health system executives

**Responsibilities**:
| Task | Description |
|------|-------------|
| Strategic oversight | Program direction, growth planning |
| Financial management | Budget, ROI tracking, resource allocation |
| Compliance accountability | Regulatory adherence, audit oversight |
| Vendor relationships | Contracts, partnerships |
| Board reporting | Executive dashboards, presentations |

**System Expectations**:
- Executive dashboards (financial + clinical)
- ROI calculators
- Compliance summaries
- Benchmark comparisons
- Strategic planning tools

**Permissions**:
```
org_admin:
  read:
    - all_organization_data
    - financial_reports
    - compliance_status
    - benchmark_data
    - audit_logs (summary)
  write:
    - organization_settings
    - user_management (delegate)
    - program_budgets
  full_access:
    - all_administrative_functions
```

---

## 3. User Interaction Workflows

### 3.1 Centralized Monitoring Model (Recommended)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PATIENT LAYER                                │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│  │ Patient  │    │ Patient  │    │ Patient  │    │ Patient  │       │
│  │ Device   │    │ Mobile   │    │ Symptoms │    │ Messages │       │
│  │ Reading  │    │ App      │    │ Log      │    │          │       │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘       │
│       │               │               │               │              │
│       └───────────────┴───────────────┴───────────────┘              │
│                               │                                       │
│                               ▼                                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    ALERT ENGINE       │
                    │  • Threshold check    │
                    │  • Pattern detection  │
                    │  • AI prioritization  │
                    │  • Smart routing      │
                    └───────────┬───────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────────┐
│                    CLINICAL TRIAGE LAYER                              │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              RPM CLINICAL STAFF (Centralized)                 │    │
│  │  • Review all alerts for organization                         │    │
│  │  • Triage by priority (Critical → Significant → Info)         │    │
│  │  • Contact patients (education, coaching, troubleshooting)    │    │
│  │  • Document assessments                                       │    │
│  │  • Escalate to appropriate provider                           │    │
│  └────────────────────────────────┬─────────────────────────────┘    │
│                                   │                                   │
│           ┌───────────────────────┼───────────────────────┐          │
│           │                       │                       │          │
│           ▼                       ▼                       ▼          │
│   ┌───────────────┐      ┌───────────────┐      ┌───────────────┐   │
│   │ Self-Resolved │      │   Scheduled   │      │  ESCALATION   │   │
│   │ (Education)   │      │   Follow-up   │      │  to Provider  │   │
│   └───────────────┘      └───────────────┘      └───────┬───────┘   │
│                                                          │           │
└──────────────────────────────────────────────────────────┼───────────┘
                                                           │
                                ┌──────────────────────────▼────────────┐
                                │         PHYSICIAN LAYER               │
                                │  ┌────────────────────────────────┐  │
                                │  │ Provider Review Dashboard       │  │
                                │  │  • Escalated items only         │  │
                                │  │  • Clinical summary + trends    │  │
                                │  │  • Treatment decision           │  │
                                │  │  • Time tracking (99457/99458)  │  │
                                │  └────────────────────────────────┘  │
                                │               │                       │
                                │               ▼                       │
                                │  ┌────────────────────────────────┐  │
                                │  │ Care Plan Update               │  │
                                │  │  • Medication adjustment        │  │
                                │  │  • Threshold modification       │  │
                                │  │  • Referral if needed           │  │
                                │  └────────────────────────────────┘  │
                                └───────────────────────────────────────┘
```

### 3.2 Key Handoff Points

| From | To | Trigger | Data Passed | SLA |
|------|-----|---------|-------------|-----|
| Patient | System | Vital reading | Device data + timestamp | Real-time |
| System | Clinical Staff | Alert generated | Patient ID, reading, alert type, priority | < 5 min |
| Clinical Staff | Physician | Escalation | Assessment, vitals, recommendation | < 30 min (critical) |
| Physician | Clinical Staff | Decision | Treatment orders, follow-up instructions | < 2 hours |
| Physician | Billing | Encounter complete | Time spent, activities, CPT code suggestion | End of day |
| All | Audit Log | Any action | User, action, timestamp, patient ID | Real-time |

### 3.3 Communication Flows

```
SYNCHRONOUS (Real-time)
├── Video Call (Patient ↔ Provider) → Billable (99457/99458)
├── Phone Call (Patient ↔ Clinical Staff/Provider) → Billable if provider
└── Live Chat (Patient ↔ Clinical Staff) → Not billable but documented

ASYNCHRONOUS
├── Secure Messaging (Patient ↔ Care Team) → Documented, not billable
├── Alert Notifications (System → Staff) → Logged
└── Educational Push (System → Patient) → Engagement tracked

AUTOMATED
├── Device Sync (Device → System) → Every reading
├── Threshold Alerts (System → Staff) → Real-time
├── Adherence Reminders (System → Patient) → Scheduled
└── Billing Eligibility (System → Billing) → Daily
```

---

## 4. Billing & Compliance Framework

### 4.1 CPT Code Requirements (CMS 2026)

| Code | Service | Requirements | Est. Reimbursement |
|------|---------|--------------|-------------------|
| **99453** | Initial setup & patient education | One-time, requires ≥2 days initial data | ~$22 |
| **99445** | Device supply (2-15 days) | NEW 2026, minimum 2 days data | ~TBD |
| **99454** | Device supply (16+ days) | ≥16 days data transmission in 30-day period | ~$47 |
| **99470** | Treatment management (10 min) | NEW 2026, requires real-time interaction | ~$26 |
| **99457** | Treatment management (20-39 min) | ≥20 min synchronous interaction (phone/video) | ~$48 |
| **99458** | Additional management (each 20 min) | After 99457 met, up to 2x/month | ~$38 |

### 4.2 Automatic Billing Compliance

```
SYSTEM TRACKS AUTOMATICALLY:
├── Data Transmission Calendar
│   └── Visual indicator: Which days had data (for 16-day requirement)
├── Interaction Timer
│   └── Start/stop during calls, auto-log duration
├── Activity Classification
│   ├── Billable: Real-time clinical interaction
│   ├── Non-billable: Education, reminders, troubleshooting
│   └── Supporting: Documentation, chart review
└── Pre-Claim Validation
    ├── 16+ days data? ✓/✗
    ├── 20+ min interaction? ✓/✗
    ├── Documentation complete? ✓/✗
    └── Suggested CPT codes
```

---

## 5. Data Model Overview

### 5.1 Core Entities

```typescript
// Organization (Tenant)
interface Organization {
  id: string;
  name: string;
  slug: string;
  type: 'clinic' | 'practice' | 'health_system';
  settings: OrganizationSettings;
  ehrIntegration?: EHRIntegration;
  createdAt: Date;
}

// User (All roles)
interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  mfaEnabled: boolean;
  lastLoginAt?: Date;
}

// Patient (extends User)
interface Patient extends User {
  dateOfBirth: Date;
  conditions: Condition[];
  devices: Device[];
  carePlan: CarePlan;
  caregivers: CaregiverLink[];
  insuranceInfo: Insurance;
  enrollmentDate: Date;
  enrollmentStatus: 'pending' | 'active' | 'paused' | 'discharged';
}

// Vital Reading
interface VitalReading {
  id: string;
  patientId: string;
  organizationId: string;
  type: VitalType; // 'blood_pressure' | 'weight' | 'glucose' | 'oxygen' | 'heart_rate' | 'temperature'
  values: Record<string, number>; // e.g., { systolic: 140, diastolic: 90, pulse: 72 }
  unit: string;
  deviceId?: string;
  source: 'device' | 'manual' | 'ehr_import';
  recordedAt: Date;
  receivedAt: Date;
  alertGenerated?: Alert;
}

// Alert
interface Alert {
  id: string;
  patientId: string;
  organizationId: string;
  vitalReadingId?: string;
  type: 'threshold' | 'trend' | 'adherence' | 'system';
  severity: 'critical' | 'significant' | 'informational';
  status: 'new' | 'acknowledged' | 'escalated' | 'resolved';
  assignedTo?: string; // Clinical staff user ID
  escalatedTo?: string; // Physician user ID
  resolution?: AlertResolution;
  createdAt: Date;
  resolvedAt?: Date;
}

// Care Plan
interface CarePlan {
  id: string;
  patientId: string;
  organizationId: string;
  conditions: ConditionCarePlan[];
  vitalThresholds: VitalThreshold[];
  medications: Medication[];
  goals: CareGoal[];
  createdBy: string;
  approvedBy: string; // Physician
  version: number;
  effectiveDate: Date;
}

// Billing Record
interface BillingRecord {
  id: string;
  patientId: string;
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  dataTransmissionDays: number;
  interactionMinutes: number;
  activities: BillableActivity[];
  eligibleCodes: CPTCode[];
  claimStatus: 'pending' | 'submitted' | 'accepted' | 'denied' | 'paid';
  claimId?: string;
}
```

### 5.2 Access Control Implementation

```typescript
// Row-Level Security Policy (PostgreSQL)
// Every table includes organizationId

// Policy: Users can only access data in their organization
CREATE POLICY org_isolation ON patients
  USING (organization_id = current_setting('app.current_org_id')::uuid);

// Policy: Clinical staff see assigned patients
CREATE POLICY clinical_assignment ON vital_readings
  USING (
    patient_id IN (
      SELECT patient_id FROM staff_assignments
      WHERE staff_id = current_setting('app.current_user_id')::uuid
    )
    OR current_setting('app.user_role') IN ('physician', 'program_admin', 'org_admin')
  );

// Policy: Caregivers see linked patients only
CREATE POLICY caregiver_access ON vital_readings
  USING (
    patient_id IN (
      SELECT patient_id FROM caregiver_links
      WHERE caregiver_id = current_setting('app.current_user_id')::uuid
      AND status = 'active'
    )
  );
```

---

## 6. Feature Priority Matrix

### 6.1 MVP (Phase 1) - Must Have

| Feature | User Benefit | Compliance Need |
|---------|-------------|-----------------|
| Patient enrollment workflow | Streamlined onboarding | CPT 99453 |
| Device data ingestion | Automatic vitals capture | CPT 99454 |
| Alert generation & dashboard | Proactive monitoring | Clinical requirement |
| Basic clinical notes | Documentation | All CPT codes |
| Patient mobile app | Daily engagement | CPT 99454 |
| Provider time tracking | Billing accuracy | CPT 99457/99458 |
| RBAC & multi-tenant | Security | HIPAA |
| Audit logging | Compliance | HIPAA |

### 6.2 Phase 2 - Should Have

| Feature | User Benefit |
|---------|-------------|
| EHR integration (FHIR) | Unified patient view |
| Video consultation | Billable interactions |
| Care plan management | Treatment coordination |
| Caregiver portal | Family engagement |
| Advanced reporting | Program optimization |
| AI alert prioritization | Reduce alert fatigue |

### 6.3 Phase 3 - Nice to Have

| Feature | User Benefit |
|---------|-------------|
| Predictive analytics | Proactive interventions |
| Patient education library | Self-management |
| Gamification | Adherence improvement |
| Population health dashboard | Strategic insights |
| Multi-language support | Accessibility |

---

## 7. Integration Requirements

### 7.1 EHR Integration (Bi-directional)

```
INBOUND (EHR → NirmiteeRPM)
├── Patient demographics
├── Problem list / Diagnoses
├── Medication list
├── Allergy list
├── Recent lab results
└── Care team information

OUTBOUND (NirmiteeRPM → EHR)
├── Vital sign observations (FHIR Observation)
├── Clinical notes / summaries
├── Alert summaries
├── Care plan updates
└── Billing documentation

SUPPORTED STANDARDS:
├── FHIR R4 (preferred)
├── HL7 V2 (legacy support)
├── CCD/CDA documents
└── Direct messaging
```

### 7.2 Device Integration

| Device Type | Data Points | Sync Method |
|-------------|-------------|-------------|
| Blood Pressure Monitor | Systolic, Diastolic, Pulse | Bluetooth/WiFi |
| Weight Scale | Weight, BMI | Bluetooth/WiFi |
| Pulse Oximeter | SpO2, Heart Rate | Bluetooth |
| Glucose Monitor | Blood Glucose, Time | Bluetooth |
| CGM (Continuous Glucose) | Glucose trends | Cloud API |
| Activity Tracker | Steps, Activity | Cloud API |

---

## 8. Security & Compliance

### 8.1 HIPAA Requirements

| Control | Implementation |
|---------|----------------|
| Access Control | RBAC, MFA required, session timeout (15 min) |
| Encryption | AES-256 at rest, TLS 1.3 in transit |
| Audit Logging | All PHI access logged, 6-year retention |
| Data Backup | Daily encrypted backups, 30-day retention |
| Breach Notification | Documented procedures, 60-day timeline |

### 8.2 Multi-Tenant Isolation

```
DATABASE LEVEL:
├── Separate schemas per organization (optional for large clients)
├── Row-level security policies on all tables
├── organizationId required on every record
└── Cross-tenant queries blocked by design

APPLICATION LEVEL:
├── JWT includes organizationId claim
├── Every API validates user belongs to org
├── Middleware enforces tenant context
└── Logging includes organization context

INFRASTRUCTURE:
├── Tenant data physically separated (optional)
├── Encryption keys per tenant (optional)
└── Audit logs isolated per tenant
```

---

## 9. Success Metrics

### 9.1 Clinical Outcomes

| Metric | Target | Measurement |
|--------|--------|-------------|
| Hospital readmission reduction | 20% decrease | 30-day readmission rate |
| ED visit reduction | 15% decrease | ED visits per 1000 patients |
| Patient adherence | 80%+ | % days with vitals submitted |
| Alert response time | < 30 min (critical) | Time to acknowledge |

### 9.2 Operational Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Billing accuracy | 95%+ | First-pass claim acceptance |
| Revenue per patient | $200+/month | Average reimbursement |
| Staff efficiency | 100+ patients/FTE | Patients managed per clinical staff |
| System uptime | 99.9% | Monthly availability |

### 9.3 Engagement Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Patient satisfaction | 4.5+/5 | NPS or satisfaction survey |
| App daily active users | 70%+ | DAU / enrolled patients |
| Provider adoption | 90%+ | Providers using system weekly |

---

## 10. Unresolved Questions

1. **Device vendor partnerships**: Which device manufacturers should we prioritize for integration?
2. **White-label requirements**: Do customers need full branding customization?
3. **Offline capability**: How critical is offline mode for patient app in low-connectivity areas?
4. **Multi-language**: Which languages beyond English are required for initial launch?
5. **Payer integration**: Direct claims submission or export for external billing systems?

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| RPM | Remote Patient Monitoring |
| CPT | Current Procedural Terminology (billing codes) |
| FHIR | Fast Healthcare Interoperability Resources |
| PHI | Protected Health Information |
| HIPAA | Health Insurance Portability and Accountability Act |
| EHR | Electronic Health Record |
| MFA | Multi-Factor Authentication |
| RBAC | Role-Based Access Control |

---

**Document Status**: Draft
**Next Review**: Upon stakeholder feedback
**Owner**: Product Team
