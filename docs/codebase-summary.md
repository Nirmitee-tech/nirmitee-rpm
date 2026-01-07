# NirmiteeRPM Codebase Summary

Generated: 2026-01-07

## Project Overview
NirmiteeRPM is an open-source Remote Patient Monitoring (RPM) platform built as a multi-tenant healthcare SaaS solution. The codebase implements a modern, production-grade architecture using TypeScript across the full stack.

## Repository Statistics
- **Total Files**: 266 files
- **Lines of Code**: ~46,000 lines
- **Primary Language**: TypeScript
- **Architecture**: Monorepo (pnpm workspaces)

## Monorepo Structure

```
NirmiteeRPM/
├── apps/
│   ├── web/          # Next.js 14 frontend (App Router)
│   └── api/          # Express.js backend API
├── packages/
│   ├── ui/           # Shared UI components
│   ├── types/        # Shared TypeScript types
│   └── config/       # Shared configs (ESLint, Tailwind, TS)
├── docs/             # Documentation
└── docker/           # Container definitions
```

## Backend (apps/api)

### Technology Stack
- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Auth**: JWT (access + refresh tokens), OAuth 2.0
- **Real-time**: Socket.io for WebSocket communication
- **Caching**: Redis for sessions, caching, pub/sub
- **Jobs**: Bull queue for background tasks
- **Monitoring**: Prometheus metrics, Winston logging

### Directory Structure
```
apps/api/src/
├── config/              # Configuration (Swagger, env)
├── jobs/                # Background job processors
│   ├── processors/      # Email, cleanup, notification, report
│   └── queue.ts         # Bull queue setup
├── middleware/          # Express middleware
│   ├── auth-middleware.ts          # JWT verification
│   ├── permission-middleware.ts     # RBAC authorization
│   ├── rate-limit-middleware.ts     # Rate limiting
│   ├── soft-delete-middleware.ts    # Soft delete support
│   ├── feature-flag-middleware.ts   # Feature toggle
│   ├── metrics-middleware.ts        # Prometheus metrics
│   └── error-handler.ts             # Global error handling
├── routes/              # API routes (v1 versioning)
│   └── v1/              # Version 1 endpoints
│       ├── auth-routes.ts
│       ├── user-routes.ts
│       ├── organization-routes.ts
│       ├── team-routes.ts
│       ├── role-routes.ts
│       ├── patient-routes.ts (planned)
│       ├── vital-routes.ts (planned)
│       ├── alert-routes.ts (planned)
│       ├── billing-routes.ts
│       ├── notification-routes.ts
│       ├── audit-routes.ts
│       ├── mfa-routes.ts
│       ├── oauth-routes.ts
│       ├── session-routes.ts
│       ├── activity-routes.ts
│       ├── search-routes.ts
│       ├── upload-routes.ts
│       └── webhook-routes.ts
├── services/            # Business logic layer
│   ├── oauth/           # OAuth provider implementations
│   │   ├── google-oauth-provider.ts
│   │   ├── microsoft-oauth-provider.ts
│   │   └── oauth-service.ts
│   ├── auth-service.ts
│   ├── user-service.ts
│   ├── organization-service.ts
│   ├── team-service.ts
│   ├── role-service.ts
│   ├── permission-service.ts
│   ├── invitation-service.ts
│   ├── mfa-service.ts
│   ├── session-service.ts
│   ├── notification-service.ts
│   ├── email-service.ts
│   ├── websocket-service.ts
│   ├── billing-service.ts
│   ├── audit-service.ts
│   ├── activity-service.ts
│   ├── cache-service.ts
│   ├── search-service.ts
│   ├── storage-service.ts
│   ├── feature-flag-service.ts
│   ├── metrics-service.ts
│   └── job-service.ts
└── utils/               # Utility functions
    ├── jwt.ts           # JWT generation/verification
    ├── password.ts      # Password hashing
    ├── prisma.ts        # Prisma client singleton
    ├── redis.ts         # Redis client
    ├── logger.ts        # Winston logger
    ├── activity-logger.ts
    ├── soft-delete.ts
    └── api-error.ts     # Custom error classes
```

### Key Services

#### Authentication & Authorization
- **auth-service.ts**: Login, signup, password reset, email verification
- **mfa-service.ts**: TOTP and Email OTP multi-factor authentication
- **oauth-service.ts**: OAuth flow orchestration (Google, Microsoft)
- **session-service.ts**: Session management, refresh token rotation
- **permission-service.ts**: Permission checking, RBAC enforcement

#### User & Organization Management
- **user-service.ts**: User CRUD, profile management
- **organization-service.ts**: Multi-tenant organization management
- **team-service.ts**: Team creation, membership
- **role-service.ts**: Custom role management
- **invitation-service.ts**: User invitation workflow

#### Platform Services
- **notification-service.ts**: Real-time notifications
- **email-service.ts**: Transactional emails (Nodemailer)
- **websocket-service.ts**: Socket.io connection management
- **audit-service.ts**: Audit log creation
- **activity-service.ts**: Activity feed generation
- **billing-service.ts**: Stripe integration (subscriptions, invoices)
- **storage-service.ts**: File upload to S3/local storage
- **search-service.ts**: Full-text search across entities
- **cache-service.ts**: Redis caching layer
- **feature-flag-service.ts**: Feature toggle management
- **metrics-service.ts**: Prometheus metrics collection
- **job-service.ts**: Background job scheduling

### Database Schema (Prisma)
```
apps/api/prisma/
├── schema.prisma        # Complete database schema
├── migrations/          # Migration history
│   ├── 20260106115959_init/
│   ├── 20260106123808_add_oauth_providers/
│   ├── 20260106144512_add_rpm_entities/
│   ├── 20260106150251_add_mfa_fields/
│   ├── 20260106151707_add_email_otp_mfa/
│   ├── 20260107055917_add_subscription_billing/
│   ├── 20260107060019_add_activity_feed/
│   ├── 20260107060232_add_file_storage/
│   └── 20260107060640_add_soft_delete_and_feature_flags/
├── seed.ts              # Database seeding
├── seed-rpm.ts          # RPM-specific seed data
└── seed-rpm-permissions.ts # RPM permission seeding
```

#### Core Models
- **Organization**: Multi-tenant root entity
- **User**: User accounts with authentication
- **OrganizationMember**: User-org-role junction
- **Role & Permission**: RBAC system
- **Team & TeamMember**: Team management
- **Session**: JWT refresh tokens
- **AuthProvider**: OAuth configuration
- **Invitation**: User invitation system

#### RPM Models
- **Patient**: Patient enrollment and demographics
- **Device**: Medical device assignments
- **VitalReading**: Vital signs data (BP, weight, glucose, etc.)
- **Alert**: Automated alerts from vitals/thresholds
- **CarePlan & CarePlanVersion**: Versioned care plans
- **BillingRecord & BillableActivity**: CPT code tracking
- **Caregiver & CaregiverLink**: Caregiver relationships

#### Supporting Models
- **Notification**: User notifications
- **NotificationPreference**: Notification settings
- **AuditLog**: Compliance audit trail
- **Activity**: User-friendly activity feed
- **Subscription & Invoice**: Stripe billing
- **File**: File upload tracking
- **FeatureFlag**: Feature toggle system
- **Backup**: Backup tracking

### API Versioning
- **Current Version**: v1
- **Strategy**: URL path-based (`/api/v1/`)
- **Future**: v2 routes in `routes/v2/`

### Middleware Pipeline
1. **Request Tracing**: Assign request ID, timing
2. **Request Logger**: Log incoming requests
3. **CORS**: Cross-origin configuration
4. **Body Parser**: JSON/URL-encoded parsing
5. **Rate Limiting**: Protect against abuse
6. **Auth Middleware**: JWT verification (if authenticated route)
7. **Permission Middleware**: RBAC check (if protected route)
8. **Feature Flag**: Check feature toggles
9. **Metrics**: Prometheus metrics collection
10. **Error Handler**: Global error handling

## Frontend (apps/web)

### Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, CVA (class-variance-authority)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **State**: React Context + hooks
- **i18n**: Custom context with JSON translation files

### Directory Structure
```
apps/web/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth layout group
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (dashboard)/          # Dashboard layout group
│   │   ├── dashboard/        # Home dashboard
│   │   ├── users/            # User management
│   │   ├── teams/            # Team management
│   │   ├── roles/            # Role management
│   │   ├── analytics/        # Analytics
│   │   ├── reports/          # Reports
│   │   ├── audit/            # Audit logs
│   │   ├── security/         # Security settings
│   │   └── settings/         # Settings hub
│   │       ├── billing/      # Billing & subscriptions
│   │       ├── branding/     # Organization branding
│   │       ├── members/      # Member management
│   │       ├── notifications/ # Notification preferences
│   │       └── sessions/     # Active sessions
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   └── page.tsx              # Landing page
├── components/               # React components
│   ├── features/             # Feature-specific components
│   │   ├── auth/             # Login, signup, MFA forms
│   │   ├── billing/          # Subscription, invoices
│   │   ├── audit/            # Audit log table
│   │   ├── invitations/      # Invitation management
│   │   ├── members/          # Member list, modals
│   │   ├── notifications/    # Notification center
│   │   ├── organization/     # Org switcher
│   │   ├── role/             # Role management
│   │   ├── team/             # Team modals
│   │   ├── user/             # User menu, invite
│   │   └── settings/         # Settings forms
│   ├── layouts/              # Layout components
│   │   ├── navbar.tsx        # Top navigation
│   │   └── sidebar.tsx       # Side navigation
│   ├── profile/              # Profile components
│   │   └── avatar-upload.tsx
│   ├── providers/            # Context providers
│   │   ├── organization-provider.tsx
│   │   ├── permission-provider.tsx
│   │   └── theme-provider.tsx
│   ├── settings/             # Settings components
│   └── ui/                   # Base UI components
│       ├── button.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       ├── form.tsx
│       ├── data-table.tsx
│       ├── confirm-dialog.tsx
│       └── ...
├── lib/                      # Library code
│   ├── api/                  # API client functions
│   │   ├── client.ts         # Axios instance
│   │   ├── auth.ts
│   │   ├── index.ts
│   │   ├── invitations.ts
│   │   ├── notifications.ts
│   │   ├── audit.ts
│   │   ├── billing.ts
│   │   ├── branding.ts
│   │   ├── profile.ts
│   │   ├── sessions.ts
│   │   └── notification-preferences.ts
│   ├── auth/                 # Auth context & hooks
│   │   └── auth-context.tsx
│   ├── i18n/                 # i18n utilities
│   │   └── i18n-context.tsx
│   ├── utils/                # Utility functions
│   └── toast.ts              # Toast notifications
├── messages/                 # i18n translation files
│   ├── en.json               # English translations
│   └── hi.json               # Hindi translations
└── i18n/                     # i18n configuration
    ├── config.ts
    └── index.ts
```

### Key Features

#### Internationalization (i18n)
- **Languages**: English (en), Hindi (hi)
- **Implementation**: Custom React context with JSON files
- **Usage**: `const { t } = useTranslations('namespace')`
- **All UI text translated**: Mandatory requirement

#### Authentication Flow
1. Login/Signup forms with validation
2. OAuth options (Google, Microsoft)
3. MFA verification (TOTP/Email OTP)
4. Refresh token rotation (httpOnly cookie)
5. Access token in React context (memory)

#### Dashboard Features
- User management (CRUD, invitations, roles)
- Team management (create, add members)
- Role management (custom roles, permissions)
- Audit log viewing and filtering
- Notification center (real-time via WebSocket)
- Settings (billing, branding, notifications, sessions)
- Analytics and reports (planned)

#### Component Architecture
- **Feature components**: Business logic components
- **UI components**: Generic, reusable components
- **Layout components**: Page structure (navbar, sidebar)
- **Providers**: Context providers for global state

## Shared Packages

### packages/ui
Shared UI component library (planned expansion)
- Button, Input, Dialog, Modal, etc.
- Consistent design system
- CVA for variant management

### packages/types
Shared TypeScript types between frontend and backend
- API request/response types
- Shared enums
- Domain models

### packages/config
Shared configuration files
- ESLint config
- TypeScript config
- Tailwind config

## Development Workflow

### Commands
```bash
# Install dependencies
pnpm install

# Development
pnpm dev                    # All services
pnpm --filter web dev       # Frontend only
pnpm --filter api dev       # Backend only

# Build
pnpm build                  # All packages
pnpm --filter api build     # Backend only

# Database
pnpm --filter api prisma migrate dev
pnpm --filter api prisma studio
pnpm --filter api prisma db seed

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Environment Variables
```bash
# Backend (apps/api/.env)
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
REDIS_URL=redis://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
SMTP_HOST=...

# Frontend (apps/web/.env)
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Architecture Patterns

### Multi-Tenancy
- **Pattern**: Shared database with `organizationId` on all tenant tables
- **RLS**: Row-Level Security via organizationId filtering
- **JWT Claim**: organizationId included in access token
- **Queries**: Always filter by organizationId

### Authentication
- **JWT**: Access tokens (15 min) + Refresh tokens (7 days)
- **Rotation**: Refresh tokens rotated on use
- **Storage**: Access in memory, refresh in httpOnly cookie
- **OAuth**: Google, Microsoft SSO support

### Authorization (RBAC)
- **Roles**: System roles (Owner, Admin, Member) + custom roles
- **Permissions**: Granular permissions (e.g., "users:read")
- **Middleware**: Permission check before route handler
- **Frontend**: Permission-based UI rendering

### Real-Time Communication
- **Technology**: Socket.io
- **Authentication**: JWT in handshake
- **Rooms**: Organization-scoped rooms (`org:${orgId}`)
- **Use Cases**: Notifications, vital signs, alerts

### API Design
- **Versioning**: URL path-based (`/api/v1/`)
- **Error Handling**: Consistent error format
- **Validation**: Zod schemas for request validation
- **Pagination**: Cursor-based (recommended) and offset-based

### Data Patterns
- **Soft Deletes**: `deletedAt` timestamp on critical models
- **Timestamps**: `createdAt`, `updatedAt` on all models
- **Audit Trail**: Comprehensive audit logging
- **Activity Feed**: User-friendly timeline

## Security Measures

1. **Authentication**: JWT with short-lived access tokens
2. **Authorization**: RBAC with granular permissions
3. **MFA**: TOTP and Email OTP support
4. **Password**: Bcrypt hashing
5. **Rate Limiting**: Protect against brute force
6. **CORS**: Configured for allowed origins
7. **CSRF**: Token validation for state-changing operations
8. **SQL Injection**: Prisma parameterized queries
9. **XSS**: React auto-escaping, CSP headers
10. **Audit Logging**: All actions logged for compliance

## Testing Strategy

### Unit Tests
- Service layer testing
- Utility function testing
- Component testing (React Testing Library)

### Integration Tests
- API endpoint testing
- Database integration testing
- Authentication flow testing

### E2E Tests (Planned)
- Critical user flows
- Multi-tenant scenarios
- OAuth flows

## Deployment

### Docker
```
docker/
├── Dockerfile.api      # API service
├── Dockerfile.web      # Web service
└── docker-compose.yml  # Development stack
```

### Production Deployment
- **API**: Containerized Node.js app
- **Web**: Containerized Next.js app (or Vercel)
- **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL)
- **Cache**: Managed Redis (AWS ElastiCache, Upstash)
- **Storage**: S3-compatible object storage

## Future Roadmap

### Phase 2: Patient Management
- Patient registration and profiles
- Care team assignments
- Patient search and filtering

### Phase 3: Device Integration
- Device registry
- Vital signs data ingestion APIs
- HL7 FHIR integration

### Phase 4: Monitoring & Alerts
- Real-time vital signs dashboard
- Configurable alert thresholds
- Escalation workflows

### Phase 5: Telehealth
- Video consultation integration
- Secure messaging
- Care plan sharing

### Phase 6: Analytics
- Patient outcome analytics
- Population health dashboards
- HIPAA compliance tools

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types
- Explicit return types on functions
- Prisma types for database models

### Code Style
- ESLint for linting
- Prettier for formatting
- Consistent naming conventions
- Comprehensive JSDoc comments

### Documentation
- README files in key directories
- API documentation (Swagger/OpenAPI)
- Architecture Decision Records (ADRs)
- Inline code comments for complex logic

## Performance Optimizations

1. **Database**: Indexes on organizationId, foreign keys, common queries
2. **Caching**: Redis for sessions, frequent queries
3. **Connection Pooling**: Prisma connection pooling
4. **API**: Response compression, pagination
5. **Frontend**: Code splitting, lazy loading, image optimization
6. **Real-time**: Room-based broadcasting, message batching

## Monitoring & Observability

- **Logging**: Winston structured logging
- **Metrics**: Prometheus metrics collection
- **Tracing**: Request tracing with correlation IDs
- **Errors**: Centralized error handling and reporting
- **Health Checks**: `/api/v1/health` endpoint

## Contributing

See CONTRIBUTING.md for:
- Code style guidelines
- PR process
- Commit message format
- Testing requirements
- Review process
