# Security Architecture

## Overview
NirmiteeRPM implements defense-in-depth security for healthcare data protection, designed to support HIPAA compliance requirements.

## Security Layers

### 1. Authentication

#### JWT-Based Authentication
- **Access Tokens**: 15-minute lifespan, stored in memory
- **Refresh Tokens**: 7-day lifespan, httpOnly secure cookies
- **Token Rotation**: Refresh tokens rotated on each use
- **Revocation**: Refresh tokens stored in database for immediate revocation

#### Multi-Factor Authentication (MFA)
- **TOTP**: Time-based One-Time Passwords (authenticator apps)
- **Email OTP**: Email-based verification codes
- **Backup Codes**: Hashed backup codes for account recovery
- **Enforcement**: Org-level MFA requirement supported

#### OAuth/SSO Support
- Google OAuth 2.0
- Microsoft Azure AD / Entra ID
- Configurable per organization
- Auto-provisioning with default roles

### 2. Authorization (RBAC)

#### Role-Based Access Control
- **System Roles**: Owner, Admin, Member
- **Custom Roles**: Organization-specific roles
- **Permissions**: Granular (e.g., "patients:read", "alerts:write")
- **Enforcement**: Middleware-based permission checks

#### Permission Scoping
```typescript
// Example permissions
users:read      // View users
users:write     // Create/update users
users:delete    // Delete users
users:manage    // All user operations

patients:read
patients:write
alerts:read
alerts:manage
```

### 3. Multi-Tenant Data Isolation

#### Row-Level Security (RLS)
- **Pattern**: Every tenant table has `organizationId`
- **Enforcement**: Middleware auto-injects organizationId filter
- **Validation**: JWT contains organizationId claim
- **Queries**: Always scoped to single organization

#### Cross-Tenant Protection
- Attempts to access other org's data return 404 (not 403)
- Foreign key constraints prevent cross-org references
- Audit logs track all data access

### 4. Network Security

#### HTTPS/TLS
- **Production**: HTTPS required for all connections
- **Certificates**: Let's Encrypt or commercial CA
- **TLS Version**: 1.2+ only
- **Cipher Suites**: Strong ciphers only

#### CORS Configuration
```typescript
const corsOptions = {
  origin: process.env.WEB_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

#### Rate Limiting
- **Authenticated**: 100 requests/minute
- **Unauthenticated**: 20 requests/minute
- **Login Endpoint**: 5 attempts/minute (brute force protection)
- **OAuth Callback**: 10 requests/minute

### 5. Data Protection

#### Encryption at Rest
- **Database**: PostgreSQL encryption (managed service or pgcrypto)
- **File Storage**: S3 server-side encryption (AES-256)
- **Backups**: Encrypted backups with separate keys
- **Secrets**: Environment variables encrypted in deployment

#### Encryption in Transit
- **API**: HTTPS/TLS for all API communication
- **WebSocket**: Secure WebSocket (WSS)
- **Database**: SSL/TLS for database connections
- **Email**: STARTTLS for SMTP

#### Sensitive Data Handling
- **Passwords**: Bcrypt hashing (10 rounds)
- **MFA Secrets**: Encrypted before storage
- **OAuth Tokens**: Encrypted before storage
- **Session Tokens**: Hashed before storage
- **PII**: Minimal collection, encrypted storage

### 6. Input Validation

#### Request Validation
```typescript
// Zod schema validation
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50)
})
```

#### SQL Injection Prevention
- **Prisma ORM**: Parameterized queries by default
- **Raw Queries**: Always use parameters
- **No String Interpolation**: Never concatenate SQL

#### XSS Prevention
- **React**: Auto-escaping by default
- **CSP Headers**: Content Security Policy configured
- **Sanitization**: DOMPurify for user-generated HTML
- **Input Encoding**: Proper encoding for all outputs

### 7. Audit Logging

#### Audit Trail
All actions logged with:
- User ID
- Organization ID
- Action (e.g., "user.created", "patient.updated")
- Entity type and ID
- Old values (before state)
- New values (after state)
- Timestamp
- IP address
- User agent

#### Compliance Requirements
- **Retention**: 7 years for healthcare compliance
- **Immutable**: Audit logs cannot be modified/deleted
- **Access Control**: View audit logs requires permission
- **Monitoring**: Alerts for suspicious patterns

#### Example Audit Log Entry
```json
{
  "id": "log_123",
  "userId": "user_456",
  "organizationId": "org_789",
  "action": "patient.viewed",
  "entity": "patient",
  "entityId": "pat_012",
  "metadata": { "source": "dashboard" },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2026-01-07T10:30:00Z"
}
```

### 8. Session Management

#### Session Security
- **Storage**: Refresh tokens in database
- **Expiration**: Automatic cleanup of expired sessions
- **Device Tracking**: User agent and IP logged
- **Revocation**: Users can revoke sessions
- **Max Sessions**: Configurable per user/org

#### Session Termination
- Manual logout (all devices or specific session)
- Password change (invalidates all sessions)
- MFA disable (requires re-authentication)
- Account suspension (immediate invalidation)

### 9. Secure File Upload

#### Upload Validation
- **File Type**: Whitelist allowed MIME types
- **File Size**: Max 10MB per file
- **Virus Scanning**: ClamAV integration (planned)
- **Malware Detection**: Content analysis

#### Storage Security
- **S3**: Private buckets with signed URLs
- **Access Control**: Pre-signed URLs (1-hour expiry)
- **Organization Isolation**: Files scoped to org
- **Encryption**: Server-side encryption

### 10. Security Headers

#### HTTP Security Headers
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}))
```

## Security Best Practices

### For Developers

1. **Never commit secrets**: Use `.env` files (gitignored)
2. **Validate all input**: Use Zod schemas
3. **Filter by organizationId**: Always in queries
4. **Hash passwords**: Use bcrypt
5. **Use HTTPS**: Development and production
6. **Update dependencies**: Regular security updates
7. **Review code**: Security-focused code reviews
8. **Test security**: Security test cases

### For Deployment

1. **Environment variables**: Secure secret management (AWS Secrets Manager, Vault)
2. **Database access**: Restrict to application servers only
3. **Firewall rules**: Whitelist only necessary ports
4. **Monitoring**: Security event monitoring
5. **Backups**: Encrypted, tested regularly
6. **Updates**: Apply security patches promptly
7. **Least privilege**: Minimum necessary permissions
8. **Network segmentation**: Separate database network

## Incident Response

### Detection
- Automated alerts for suspicious activity
- Failed login monitoring
- Unusual data access patterns
- Rate limit violations

### Response Plan
1. **Identify**: Detect and confirm security incident
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove threat
4. **Recover**: Restore services
5. **Document**: Record incident details
6. **Review**: Post-incident analysis

### Security Contacts
- **Security Team**: security@nirmitee.io
- **Emergency**: emergency@nirmitee.io

## Compliance

### HIPAA Readiness
- Encryption at rest and in transit
- Audit logging (7-year retention)
- Access controls (RBAC)
- Session management
- Data backup and recovery
- Incident response plan

### Requirements Checklist
- [ ] Encryption (at rest, in transit)
- [ ] Access controls (RBAC, MFA)
- [ ] Audit trail (comprehensive logging)
- [ ] Data backup (encrypted, tested)
- [ ] Incident response (documented plan)
- [ ] Business Associate Agreements (BAAs)
- [ ] Security risk assessments
- [ ] Employee training

## Security Monitoring

### Metrics
- Failed login attempts
- Token refresh rate
- Permission denials
- Rate limit violations
- Unusual data access patterns
- Session creation/termination

### Alerts
- Multiple failed logins (brute force)
- Cross-org access attempts
- Privilege escalation attempts
- Unusual API usage patterns
- Database query anomalies

### Tools
- **Logging**: Winston structured logging
- **Metrics**: Prometheus
- **Monitoring**: Grafana dashboards
- **Alerting**: PagerDuty/Opsgenie integration

## Third-Party Security

### Dependency Management
- Regular updates via Dependabot
- Security audits: `pnpm audit`
- Known vulnerability scanning
- License compliance checking

### API Integrations
- OAuth providers (Google, Microsoft)
- Email service (SMTP, SendGrid)
- Payment processing (Stripe)
- File storage (AWS S3)
- All integrations use HTTPS and API keys

## Penetration Testing

### Recommended Schedule
- Annual professional penetration test
- Quarterly automated security scans
- Regular vulnerability assessments
- Code security reviews

### Scope
- Authentication and authorization
- API endpoints
- Database security
- Network security
- Client-side security

## Security Roadmap

### Short-term (3 months)
- [ ] Implement CSRF protection
- [ ] Add security headers
- [ ] Enable rate limiting on all endpoints
- [ ] Implement file upload virus scanning

### Medium-term (6 months)
- [ ] Complete HIPAA compliance certification
- [ ] Implement API key authentication
- [ ] Add IP whitelisting for API access
- [ ] Implement advanced threat detection

### Long-term (12 months)
- [ ] SOC 2 Type II certification
- [ ] Implement end-to-end encryption
- [ ] Add hardware token support (YubiKey)
- [ ] Implement zero-trust architecture
