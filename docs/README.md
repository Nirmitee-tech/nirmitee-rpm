# NirmiteeRPM Documentation

Welcome to the NirmiteeRPM documentation. This directory contains comprehensive documentation for developers, operators, and contributors.

## Quick Start
- [Getting Started](../README.md#getting-started) - Setup and installation
- [Codebase Summary](./codebase-summary.md) - High-level overview of the entire codebase
- [Contributing](../CONTRIBUTING.md) - How to contribute

## Architecture

### Architecture Decision Records (ADRs)
Documenting key technical decisions:
- [ADR-001: Monorepo Structure](./architecture/decisions/001-monorepo-structure.md) - Why pnpm workspaces
- [ADR-002: Authentication Strategy](./architecture/decisions/002-authentication-strategy.md) - JWT + refresh tokens
- [ADR-003: Multi-Tenancy Approach](./architecture/decisions/003-multi-tenancy-approach.md) - organizationId pattern
- [ADR-004: Database Choice](./architecture/decisions/004-database-choice.md) - PostgreSQL + Prisma
- [ADR-005: API Versioning](./architecture/decisions/005-api-versioning.md) - /v1/ prefix strategy
- [ADR-006: Real-Time Strategy](./architecture/decisions/006-real-time-strategy.md) - Socket.io choice

## Database

### Schema & Queries
- [Database Schema](./database/schema.md) - Complete schema documentation with ERD
- [Common Queries](./database/queries.md) - Query patterns and performance tips

### Key Concepts
- Multi-tenancy with `organizationId` on all tables
- Soft deletes for critical data
- Audit logging for compliance
- Indexes for performance

## API Reference

### Endpoints
- [API Overview](./api/README.md) - Authentication, pagination, errors, rate limiting
- [API Endpoints](./api/endpoints.md) - Complete endpoint reference

### Authentication
- JWT access tokens (15 min)
- Refresh tokens (7 days)
- OAuth/SSO (Google, Microsoft)
- Multi-factor authentication (TOTP, Email OTP)

### Versioning
- Current version: **v1**
- Base URL: `/api/v1`
- URL path-based versioning

## Security

### Documentation
- [Security Architecture](./security/README.md) - Comprehensive security overview
- [Security Checklist](./security/checklist.md) - Pre-deployment and OWASP Top 10

### Key Features
- RBAC with granular permissions
- Multi-tenant data isolation
- Encryption at rest and in transit
- Comprehensive audit logging
- HIPAA-ready architecture

## Operations

### Runbooks
- [Deployment](./runbooks/deployment.md) - Production deployment procedures
- [Incident Response](./runbooks/incident-response.md) - Incident handling procedures

### Monitoring
- Health checks
- Error tracking
- Performance metrics
- Security alerts

## Development

### Code Standards
- TypeScript strict mode (no `any` types)
- Multi-tenancy patterns (always filter by organizationId)
- Internationalization (all UI text translated)
- Testing requirements (>80% coverage)

### Workflows
- Feature branch workflow
- Conventional commits
- Code review process
- CI/CD pipeline

## Project Documentation

### Specifications
- [RPM System Specification](./rpm-system-specification.md) - RPM features and requirements
- [RPM Jira Stories](./rpm-jira-stories.md) - User stories for RPM features
- [RBAC Implementation Guide](./rbac-implementation-guide.md) - Role-based access control

## Technology Stack

### Backend
- Node.js 20+ with Express.js
- PostgreSQL 15+ with Prisma ORM
- Redis for caching and sessions
- Socket.io for real-time features
- Bull for background jobs

### Frontend
- Next.js 14 (App Router)
- React 18 with TypeScript
- Tailwind CSS
- Internationalization (en, hi)

### Infrastructure
- Docker containerization
- Kubernetes for orchestration
- PostgreSQL managed database
- Redis managed cache
- S3-compatible object storage

## Documentation Guidelines

### When to Update Documentation
- Adding new features
- Changing APIs
- Updating database schema
- Modifying architecture
- Security changes
- Deployment process changes

### Documentation Standards
- Clear, concise language
- Code examples included
- Diagrams where helpful
- Keep docs maintainable
- Reference actual file paths

## Additional Resources

### External Links
- [GitHub Repository](https://github.com/your-org/NirmiteeRPM)
- [API Status Page](https://status.nirmitee.io)
- [Community Forum](https://community.nirmitee.io)

### Support
- Documentation Issues: Open GitHub issue
- Security Issues: security@nirmitee.io
- General Support: support@nirmitee.io

## Documentation Structure

```
docs/
├── README.md (this file)
├── codebase-summary.md
├── architecture/
│   └── decisions/
│       ├── 001-monorepo-structure.md
│       ├── 002-authentication-strategy.md
│       ├── 003-multi-tenancy-approach.md
│       ├── 004-database-choice.md
│       ├── 005-api-versioning.md
│       └── 006-real-time-strategy.md
├── database/
│   ├── schema.md
│   └── queries.md
├── api/
│   ├── README.md
│   └── endpoints.md
├── security/
│   ├── README.md
│   └── checklist.md
├── runbooks/
│   ├── deployment.md
│   └── incident-response.md
├── rbac-implementation-guide.md
├── rpm-system-specification.md
└── rpm-jira-stories.md
```

## Contributing to Documentation

### How to Contribute
1. Identify documentation gap or outdated content
2. Create feature branch
3. Update documentation (Markdown format)
4. Submit pull request
5. Documentation review

### Style Guide
- Use Markdown format
- Include code examples
- Add diagrams for complex concepts
- Keep language clear and concise
- Update table of contents when adding new sections

## License
This documentation is licensed under the MIT License, same as the project.

---

**Last Updated:** 2026-01-07
**Documentation Version:** 1.0.0
