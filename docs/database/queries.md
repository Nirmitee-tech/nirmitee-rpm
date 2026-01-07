# Common Database Queries & Performance Tips

## Multi-Tenant Query Patterns

### Always Filter by organizationId
```typescript
// ✅ CORRECT - Always include organizationId
const patients = await prisma.patient.findMany({
  where: {
    organizationId: req.user.organizationId,
    enrollmentStatus: 'ACTIVE'
  }
})

// ❌ WRONG - Missing organizationId (security risk!)
const patients = await prisma.patient.findMany({
  where: { enrollmentStatus: 'ACTIVE' }
})
```

### Compound Where Clauses
```typescript
// Filter with multiple conditions
const vitals = await prisma.vitalReading.findMany({
  where: {
    organizationId,
    patientId,
    type: 'BLOOD_PRESSURE',
    recordedAt: {
      gte: startDate,
      lte: endDate
    },
    deletedAt: null  // Exclude soft-deleted
  },
  orderBy: { recordedAt: 'desc' },
  take: 100
})
```

## N+1 Query Prevention

### Problem: N+1 Query
```typescript
// ❌ WRONG - Triggers N+1 queries
const patients = await prisma.patient.findMany({ where: { organizationId } })

for (const patient of patients) {
  // N queries!
  const vitals = await prisma.vitalReading.findMany({
    where: { patientId: patient.id }
  })
}
```

### Solution 1: Use `include`
```typescript
// ✅ CORRECT - Single query with join
const patients = await prisma.patient.findMany({
  where: { organizationId },
  include: {
    vitalReadings: {
      where: { recordedAt: { gte: last24Hours } },
      orderBy: { recordedAt: 'desc' },
      take: 10
    },
    devices: { where: { status: 'ACTIVE' } }
  }
})
```

### Solution 2: Batch Queries
```typescript
// ✅ CORRECT - Two queries instead of N+1
const patients = await prisma.patient.findMany({ where: { organizationId } })
const patientIds = patients.map(p => p.id)

const vitals = await prisma.vitalReading.findMany({
  where: {
    patientId: { in: patientIds },
    recordedAt: { gte: last24Hours }
  }
})

// Group vitals by patientId in application
const vitalsByPatient = groupBy(vitals, 'patientId')
```

## Pagination

### Cursor-Based Pagination (Recommended)
```typescript
// Efficient for large datasets
const pageSize = 20

const patients = await prisma.patient.findMany({
  where: { organizationId },
  take: pageSize + 1,  // Fetch one extra to check for next page
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' }
})

const hasNextPage = patients.length > pageSize
const results = patients.slice(0, pageSize)
const nextCursor = hasNextPage ? results[results.length - 1].id : null
```

### Offset-Based Pagination
```typescript
// Simpler but less efficient for large offsets
const page = 1
const pageSize = 20

const [patients, total] = await prisma.$transaction([
  prisma.patient.findMany({
    where: { organizationId },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' }
  }),
  prisma.patient.count({ where: { organizationId } })
])

const totalPages = Math.ceil(total / pageSize)
```

## Aggregations

### Count Queries
```typescript
// Count with filters
const activePatientCount = await prisma.patient.count({
  where: {
    organizationId,
    enrollmentStatus: 'ACTIVE',
    deletedAt: null
  }
})

// Group by status
const patientsByStatus = await prisma.patient.groupBy({
  by: ['enrollmentStatus'],
  where: { organizationId },
  _count: true
})
```

### Aggregate Functions
```typescript
// Average, min, max
const vitalStats = await prisma.vitalReading.aggregate({
  where: {
    organizationId,
    patientId,
    type: 'BLOOD_PRESSURE',
    recordedAt: { gte: last30Days }
  },
  _avg: { 'values.systolic': true },
  _min: { recordedAt: true },
  _max: { recordedAt: true },
  _count: true
})
```

## Complex Queries

### Nested Includes
```typescript
// Deep nesting (use sparingly)
const organization = await prisma.organization.findUnique({
  where: { id: organizationId },
  include: {
    members: {
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        role: { include: { permissions: { include: { permission: true } } } }
      }
    },
    teams: {
      include: {
        members: { include: { user: true } }
      }
    }
  }
})
```

### Select Specific Fields
```typescript
// Reduce payload size
const users = await prisma.user.findMany({
  where: { isActive: true },
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    // Omit passwordHash, mfaSecret, etc.
  }
})
```

## Transactions

### Sequential Transactions
```typescript
// Ensure atomicity
const result = await prisma.$transaction(async (tx) => {
  // Create user
  const user = await tx.user.create({
    data: { email, passwordHash, firstName, lastName }
  })

  // Add to organization
  const member = await tx.organizationMember.create({
    data: { userId: user.id, organizationId, roleId }
  })

  // Send invitation email
  await emailService.sendWelcome(user.email)

  return { user, member }
})
```

### Parallel Queries in Transaction
```typescript
// Execute multiple queries atomically
const [user, orgCount, teamCount] = await prisma.$transaction([
  prisma.user.findUnique({ where: { id: userId } }),
  prisma.organization.count(),
  prisma.team.count({ where: { organizationId } })
])
```

## Raw SQL Queries

### When to Use Raw SQL
- Complex analytics queries
- Database-specific features
- Performance-critical queries
- Bulk operations

### Raw Query Example
```typescript
// Complex aggregation
const alertStats = await prisma.$queryRaw<AlertStats[]>`
  SELECT
    severity,
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_resolution_time
  FROM alerts
  WHERE organization_id = ${organizationId}
    AND created_at >= ${startDate}
  GROUP BY severity, status
  ORDER BY severity DESC, status
`
```

### Parameterized Queries
```typescript
// Always use parameters (prevents SQL injection)
const patients = await prisma.$queryRaw`
  SELECT * FROM patients
  WHERE organization_id = ${organizationId}
    AND enrollment_status = ${status}
  LIMIT ${limit}
`
```

## Performance Tips

### Use Indexes Effectively
```prisma
// Define indexes for common queries
model VitalReading {
  // Single-column indexes
  @@index([organizationId])
  @@index([patientId])

  // Compound indexes (order matters!)
  @@index([patientId, recordedAt])
  @@index([organizationId, recordedAt])
  @@index([patientId, type, recordedAt])
}
```

### Optimize Queries
1. **Select only needed fields**: Use `select` to reduce payload
2. **Limit results**: Use `take` to prevent large result sets
3. **Use cursor pagination**: More efficient than offset for large datasets
4. **Avoid deep nesting**: Limit `include` depth (max 2-3 levels)
5. **Batch operations**: Use `createMany`, `updateMany`, `deleteMany`

### Connection Pooling
```typescript
// Configure in DATABASE_URL
DATABASE_URL="postgresql://user:pass@host/db?connection_limit=20&pool_timeout=10"

// Or in Prisma client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})
```

## Soft Delete Patterns

### Query Excluding Soft-Deleted
```typescript
// Always filter out soft-deleted
const activePatients = await prisma.patient.findMany({
  where: {
    organizationId,
    deletedAt: null  // Exclude soft-deleted
  }
})
```

### Middleware for Automatic Filtering
```typescript
// Automatically exclude soft-deleted
prisma.$use(async (params, next) => {
  if (params.action === 'findMany' || params.action === 'findFirst') {
    if (!params.args) params.args = {}
    if (!params.args.where) params.args.where = {}

    params.args.where.deletedAt = null
  }

  return next(params)
})
```

### Restore Soft-Deleted
```typescript
// Un-delete a record
await prisma.patient.update({
  where: { id: patientId },
  data: { deletedAt: null }
})
```

## JSON Field Queries

### Query JSON Fields
```typescript
// Filter by JSON field value
const highBPReadings = await prisma.vitalReading.findMany({
  where: {
    organizationId,
    type: 'BLOOD_PRESSURE',
    values: {
      path: ['systolic'],
      gte: 140
    }
  }
})

// Raw SQL for complex JSON queries
const readings = await prisma.$queryRaw`
  SELECT * FROM vital_readings
  WHERE organization_id = ${organizationId}
    AND (values->>'systolic')::int >= 140
    AND (values->>'diastolic')::int >= 90
`
```

### Type-Safe JSON Access
```typescript
// Cast JSON to typed object
import { Prisma } from '@prisma/client'

interface BPReading {
  systolic: number
  diastolic: number
  pulse: number
}

const reading = await prisma.vitalReading.create({
  data: {
    organizationId,
    patientId,
    type: 'BLOOD_PRESSURE',
    values: { systolic: 140, diastolic: 90, pulse: 72 } as Prisma.InputJsonValue,
    unit: 'mmHg',
    source: 'DEVICE',
    recordedAt: new Date()
  }
})

// Access with type assertion
const values = reading.values as BPReading
console.log(values.systolic)
```

## Monitoring & Debugging

### Enable Query Logging
```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})
```

### Log Slow Queries
```typescript
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' }
  ]
})

prisma.$on('query', (e) => {
  if (e.duration > 1000) {  // Log queries > 1s
    logger.warn('Slow query detected', {
      query: e.query,
      duration: e.duration,
      params: e.params
    })
  }
})
```

### Analyze Query Performance
```sql
-- Use EXPLAIN to analyze query plans
EXPLAIN ANALYZE
SELECT * FROM patients
WHERE organization_id = 'org_123'
  AND enrollment_status = 'ACTIVE';
```

## Security Best Practices

1. **Always validate organizationId**: Never trust client-provided organizationId
2. **Use parameterized queries**: Prevent SQL injection
3. **Limit query results**: Prevent resource exhaustion
4. **Validate input**: Check data types and formats before queries
5. **Use read replicas**: For analytics/reporting (reduce main DB load)
6. **Implement rate limiting**: Prevent abuse
7. **Audit sensitive queries**: Log access to patient data
