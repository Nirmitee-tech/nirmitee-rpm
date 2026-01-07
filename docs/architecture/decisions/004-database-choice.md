# ADR-004: PostgreSQL with Prisma ORM

## Status
Accepted

## Context
Healthcare RPM platform requires robust data persistence for:
- Patient records, vital signs, care plans
- User accounts, organizations, permissions
- Audit logs, notifications, billing records
- Complex relationships and querying
- ACID compliance for healthcare data integrity
- Type-safe database access in TypeScript

Need database that balances:
- Relational integrity for complex healthcare workflows
- Performance for real-time vital signs ingestion
- Type safety and developer experience
- Production-grade reliability
- Open-source and self-hostable

## Decision
Use **PostgreSQL 15+** as primary database with **Prisma ORM** for type-safe data access.

### Why PostgreSQL
- Industry-standard relational database
- ACID compliance for data integrity
- Advanced features: JSON columns, full-text search, CTEs
- Excellent performance and scalability
- Robust backup and replication
- Open source with strong ecosystem

### Why Prisma
- Type-safe database client generated from schema
- Migration system with version control
- Excellent TypeScript integration
- Intuitive query API (easier than raw SQL for most cases)
- Studio for database browsing
- Active development and community

## Consequences

### Positive
- **Type safety**: Compile-time errors for invalid queries
- **Developer experience**: Intuitive API, great autocomplete
- **Schema-first**: Single source of truth in `schema.prisma`
- **Migrations**: Version-controlled schema evolution
- **Multi-database**: Prisma supports PostgreSQL, MySQL, SQLite (for tests)
- **Relational integrity**: Foreign keys, cascading deletes, constraints
- **Advanced types**: Enums, JSON, DateTime handled correctly
- **Connection pooling**: Built-in with Prisma connection management
- **Audit trail**: Migration history tracked in database

### Negative
- **Learning curve**: Team needs to learn Prisma API
- **Abstraction**: Some advanced PostgreSQL features require raw queries
- **Performance overhead**: ORM adds slight overhead vs raw SQL
- **Migration conflicts**: Multiple developers may create conflicting migrations
- **Large schema**: Generated client can be large for complex schemas
- **Vendor lock**: Switching ORMs is major refactor

## Alternatives Considered

### 1. Raw SQL with pg library
- Direct PostgreSQL queries
- **Rejected**: No type safety, error-prone, boilerplate for simple queries

### 2. TypeORM
- Popular TypeScript ORM with decorator-based models
- **Rejected**: Less intuitive API, migration system less robust, declining popularity

### 3. Drizzle ORM
- New lightweight ORM with excellent TypeScript support
- **Deferred**: Promising but less mature, smaller ecosystem than Prisma

### 4. Kysely
- Type-safe SQL query builder (not full ORM)
- **Rejected**: More verbose than Prisma, still need to manage schema separately

### 5. MongoDB
- NoSQL document database
- **Rejected**: Healthcare data is highly relational, ACID compliance critical

### 6. MySQL
- Popular relational database
- **Rejected**: PostgreSQL has better JSON support, more advanced features

## Schema Design Principles

### Multi-tenancy
All tenant-scoped tables include `organizationId`:
```prisma
model Patient {
  id              String   @id @default(cuid())
  organizationId  String
  // ...
  @@index([organizationId])
}
```

### Soft Deletes
Critical records use soft deletes:
```prisma
model Patient {
  deletedAt  DateTime?
  @@index([deletedAt])
}
```

### Timestamps
All tables include:
```prisma
createdAt  DateTime @default(now())
updatedAt  DateTime @updatedAt
```

### JSON for Flexibility
Use JSON for flexible/nested data:
```prisma
model VitalReading {
  values  Json  // { systolic: 140, diastolic: 90, pulse: 72 }
}
```

### Enums for Type Safety
```prisma
enum EnrollmentStatus {
  PENDING
  ACTIVE
  PAUSED
  DISCHARGED
}
```

## Performance Optimization

### Indexing Strategy
- Index `organizationId` on all tenant tables
- Compound indexes for common query patterns
- Index foreign keys for join performance

```prisma
@@index([organizationId, createdAt])
@@index([patientId, recordedAt])
```

### Connection Pooling
```typescript
// apps/api/src/utils/prisma.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})
```

Use connection pool limits in DATABASE_URL:
```
postgresql://user:pass@host/db?connection_limit=10
```

### Query Optimization
- Use `select` to fetch only needed fields
- Use `include` judiciously (avoid N+1)
- Batch queries with `Promise.all()`
- Use raw queries for complex analytics

## Migration Strategy

### Development
```bash
pnpm prisma migrate dev --name descriptive_name
```

### Production
```bash
pnpm prisma migrate deploy
```

### Rollback
Keep migration SQL files in version control. Manual rollback if needed:
```bash
psql -f migrations/rollback_xyz.sql
```

## Backup Strategy
- Automated daily backups with `pg_dump`
- Point-in-time recovery with WAL archiving
- Regular restore testing
- Backup retention: 30 days

## Testing

### Test Database
Use separate test database:
```bash
DATABASE_URL="postgresql://localhost:5432/nirmitee_test"
```

### Seed Data
```bash
pnpm prisma db seed
```

### Integration Tests
Reset database between tests:
```typescript
beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "patients" CASCADE`
})
```

## Monitoring
- Query performance monitoring
- Connection pool metrics
- Slow query logging
- Database size monitoring

## Related
- ADR-003: Multi-tenancy pattern (organizationId in all tables)
- Database schema documentation
- Migration guide
- Performance tuning guide
