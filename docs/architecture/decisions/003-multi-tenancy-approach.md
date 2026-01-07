# ADR-003: Multi-Tenancy with organizationId Pattern

## Status
Accepted

## Context
NirmiteeRPM serves multiple healthcare organizations (clinics, hospitals) requiring:
- **Data isolation**: Organization A cannot see Organization B's data
- **Performance**: Efficient queries without cross-tenant data leakage
- **Scalability**: Support thousands of organizations
- **Cost efficiency**: Shared infrastructure, not dedicated databases per tenant
- **HIPAA compliance**: Robust data isolation for patient data

Need multi-tenancy strategy balancing isolation, performance, and operational simplicity.

## Decision
Implement **shared database with Row-Level Security (RLS) via organizationId column** on all tenant-scoped tables.

### Pattern
```prisma
model Patient {
  id              String   @id @default(cuid())
  organizationId  String   // MANDATORY for RLS
  // ... other fields

  organization    Organization @relation(...)

  @@index([organizationId])  // MANDATORY index
}
```

### Query Pattern
```typescript
// ALWAYS filter by organizationId from JWT token
const patients = await prisma.patient.findMany({
  where: { organizationId: req.user.organizationId }
})
```

### Middleware Enforcement
```typescript
// Automatically inject organizationId filter
prisma.$use(async (params, next) => {
  if (params.model && isTenantModel(params.model)) {
    params.args.where = {
      ...params.args.where,
      organizationId: currentOrganizationId
    }
  }
  return next(params)
})
```

## Consequences

### Positive
- **Simple architecture**: Single database, standard Prisma queries
- **Cost effective**: Shared infrastructure for all tenants
- **Fast queries**: Database indexes ensure efficient filtering
- **Easy backups**: Single database to backup
- **Schema evolution**: Single migration for all tenants
- **Cross-tenant analytics**: Possible for platform-level metrics (with care)
- **Developer experience**: Standard SQL, no special tooling

### Negative
- **Noisy neighbor risk**: One tenant's heavy load affects others
- **Security critical**: Must never forget organizationId filter (developer error risk)
- **Limited isolation**: Same database processes all tenant data
- **Scaling ceiling**: Eventually hit single-database limits
- **Schema changes**: All tenants get same schema (can't customize per tenant)

## Alternatives Considered

### 1. Database per tenant
- Separate PostgreSQL database for each organization
- **Rejected**: Operational nightmare (1000s of databases), expensive, hard to backup, schema migrations complex

### 2. Schema per tenant
- PostgreSQL schemas (namespaces) per organization
- **Rejected**: Better than DB-per-tenant but still migration complexity, connection pooling issues

### 3. Separate deployments
- Dedicated infrastructure per major customer
- **Rejected**: For enterprise tier only, not default approach

### 4. Table partitioning by organizationId
- PostgreSQL native partitioning
- **Deferred**: May implement later for performance at scale, but added complexity now

## Security Implementation

### Mandatory Rules
1. **All tenant-scoped tables MUST have organizationId**
2. **All queries MUST filter by organizationId** (from JWT token)
3. **Database indexes on organizationId** for performance
4. **Foreign key constraints** ensure referential integrity within organization
5. **Audit logging** includes organizationId for all actions

### Exceptions (System Tables)
These tables do NOT have organizationId:
- `Organization` (is the tenant itself)
- `Permission` (global system permissions)
- `FeatureFlag` (system-wide features)
- `Backup` (system operations)

### Testing Strategy
- Integration tests verify organizationId filtering
- Attempt cross-org access should return 404 (not 403 to avoid leaking existence)
- Seed tests with multiple organizations
- Load tests with 100+ organizations

## Migration to Alternative Approach

If scaling requires change:

### Option A: Shard by organizationId
- Distribute organizations across multiple databases
- Use consistent hashing to route queries
- Maintains RLS pattern, just adds routing layer

### Option B: Move to dedicated databases for large tenants
- Keep shared DB for small/medium organizations
- Migrate large organizations to dedicated DBs
- Use database URL in Organization table to route

## Prisma Implementation

### Type Safety
```typescript
// Types automatically include organizationId
type CreatePatientInput = Prisma.PatientCreateInput  // includes organizationId

// Service layer enforces organizationId
async createPatient(organizationId: string, data: PatientInput) {
  return prisma.patient.create({
    data: {
      ...data,
      organizationId  // Explicitly set
    }
  })
}
```

### Soft Deletes
Combine with soft deletes for compliance:
```prisma
model Patient {
  organizationId  String
  deletedAt       DateTime?

  @@index([organizationId, deletedAt])
}
```

Query filters both:
```typescript
where: {
  organizationId,
  deletedAt: null  // Exclude soft-deleted
}
```

## Related
- ADR-002: JWT tokens include organizationId claim
- Database schema documentation
- Security checklist for multi-tenant queries
- RBAC implementation (roles scoped to organization)
