# Security Checklist

## Pre-Deployment Security Checklist

### Authentication & Authorization
- [ ] JWT secrets are strong and unique (min 32 characters)
- [ ] Refresh token rotation implemented
- [ ] MFA available and tested (TOTP + Email OTP)
- [ ] OAuth providers configured with correct redirect URLs
- [ ] Session expiration configured correctly (15 min access, 7 day refresh)
- [ ] Password complexity requirements enforced (8+ chars, uppercase, number)
- [ ] Bcrypt hash rounds configured (min 10)
- [ ] Failed login attempts rate limited
- [ ] RBAC permissions tested for all roles
- [ ] Permission middleware applied to protected routes

### Data Protection
- [ ] Database connection uses SSL/TLS
- [ ] All passwords hashed with bcrypt
- [ ] MFA secrets encrypted before storage
- [ ] OAuth tokens encrypted before storage
- [ ] Refresh tokens hashed before storage
- [ ] Environment variables never committed to git
- [ ] Secrets stored in secure secret manager (not .env in production)
- [ ] File uploads stored securely (S3 with encryption)
- [ ] Pre-signed URLs expire appropriately (1 hour max)
- [ ] PII data encrypted at rest

### Network Security
- [ ] HTTPS/TLS enforced for all connections
- [ ] TLS 1.2+ only, strong cipher suites
- [ ] CORS configured with specific origins (not `*`)
- [ ] Security headers configured (Helmet.js)
- [ ] CSP headers prevent XSS
- [ ] Rate limiting enabled on all endpoints
- [ ] WebSocket connections secured (WSS)
- [ ] Database not exposed to public internet
- [ ] Firewall rules configured (allow only necessary ports)

### Multi-Tenant Security
- [ ] All tenant tables have `organizationId` column
- [ ] All tenant tables indexed on `organizationId`
- [ ] All queries filter by `organizationId`
- [ ] Cross-org access attempts return 404 (not 403)
- [ ] JWT token includes `organizationId` claim
- [ ] Foreign keys prevent cross-org references
- [ ] Middleware auto-injects `organizationId` filter
- [ ] Unit tests verify multi-tenant isolation

### Input Validation
- [ ] All API endpoints use Zod validation
- [ ] File upload types whitelisted
- [ ] File upload size limited (10MB default)
- [ ] SQL injection prevented (Prisma parameterized queries)
- [ ] XSS prevented (React auto-escaping + CSP)
- [ ] CSRF tokens validated for state-changing operations
- [ ] Email validation prevents injection
- [ ] URL validation prevents open redirects

### Audit & Logging
- [ ] Audit logging enabled for all critical actions
- [ ] Audit logs include: user, org, action, entity, timestamp, IP, user agent
- [ ] Audit log retention configured (7 years for healthcare)
- [ ] Audit logs immutable (no updates/deletes)
- [ ] Access to audit logs requires permission
- [ ] Error logging doesn't expose sensitive data
- [ ] Log aggregation configured (CloudWatch, Datadog, etc.)
- [ ] Alerts configured for suspicious activity

### Session Management
- [ ] Sessions stored in database
- [ ] Expired sessions cleaned up automatically
- [ ] User can view active sessions
- [ ] User can revoke sessions
- [ ] Password change invalidates all sessions
- [ ] Max sessions per user configured
- [ ] Session cookies have `httpOnly` and `secure` flags
- [ ] Session cookies have `SameSite=Strict`

### API Security
- [ ] API versioning implemented (/v1/)
- [ ] Error messages don't leak sensitive info
- [ ] Rate limits tested and working
- [ ] Pagination prevents resource exhaustion
- [ ] Large payloads rejected
- [ ] API documentation doesn't expose secrets
- [ ] Webhook signatures validated
- [ ] API keys (if used) rotatable

### Database Security
- [ ] Database user has minimal privileges
- [ ] Database connection pooling configured
- [ ] Database backups encrypted
- [ ] Database backup tested (restore test)
- [ ] Database migration tested on staging first
- [ ] Soft deletes implemented for critical data
- [ ] Database query logging for slow queries
- [ ] Database connection string not logged

### Dependency Security
- [ ] All dependencies up to date
- [ ] `pnpm audit` shows no critical vulnerabilities
- [ ] Dependabot enabled for automated updates
- [ ] License compliance checked
- [ ] Third-party services reviewed for security
- [ ] No development dependencies in production

### Compliance (HIPAA)
- [ ] Encryption at rest enabled
- [ ] Encryption in transit enabled
- [ ] Audit logging comprehensive (7-year retention)
- [ ] Access controls (RBAC + MFA)
- [ ] Data backup and recovery tested
- [ ] Incident response plan documented
- [ ] Business Associate Agreements (BAAs) in place
- [ ] Security risk assessment completed
- [ ] Employee security training completed

### Monitoring & Alerting
- [ ] Failed login alerts configured
- [ ] Cross-org access attempt alerts
- [ ] Rate limit violation alerts
- [ ] Unusual API usage alerts
- [ ] Database anomaly detection
- [ ] Error rate monitoring
- [ ] Performance monitoring (response times)
- [ ] Uptime monitoring configured

### Infrastructure Security
- [ ] Firewall configured (allow only necessary ports)
- [ ] Database on private network
- [ ] Redis on private network
- [ ] Environment variables in secret manager
- [ ] Container images scanned for vulnerabilities
- [ ] Least privilege IAM roles
- [ ] Network segmentation implemented
- [ ] DDoS protection enabled
- [ ] CDN with WAF configured
- [ ] Automated security updates enabled

### Code Security
- [ ] No hardcoded secrets in code
- [ ] No `console.log` with sensitive data
- [ ] Error handling doesn't expose stack traces
- [ ] No commented-out sensitive code
- [ ] Security code review completed
- [ ] Static code analysis passed (SonarQube, etc.)
- [ ] No `eval()` or dangerous functions
- [ ] Dependency injection for testability

### Testing
- [ ] Authentication flow tested
- [ ] Authorization (RBAC) tested
- [ ] Multi-tenant isolation tested
- [ ] Rate limiting tested
- [ ] Session management tested
- [ ] Input validation tested (malicious input)
- [ ] File upload security tested
- [ ] SQL injection prevention tested
- [ ] XSS prevention tested
- [ ] CSRF protection tested

## OWASP Top 10 Coverage

### A01:2021 - Broken Access Control
- [x] RBAC implemented
- [x] Permission checks on all protected routes
- [x] Multi-tenant data isolation
- [x] Session management

### A02:2021 - Cryptographic Failures
- [x] TLS/HTTPS enforced
- [x] Passwords hashed (bcrypt)
- [x] Sensitive data encrypted at rest
- [x] Strong secrets configured

### A03:2021 - Injection
- [x] Prisma ORM (parameterized queries)
- [x] Input validation (Zod schemas)
- [x] No eval() or dangerous functions
- [x] XSS prevention (React + CSP)

### A04:2021 - Insecure Design
- [x] Threat modeling completed
- [x] Secure architecture patterns
- [x] Defense in depth
- [x] Principle of least privilege

### A05:2021 - Security Misconfiguration
- [x] Security headers configured
- [x] CORS properly configured
- [x] Error messages sanitized
- [x] Unnecessary features disabled

### A06:2021 - Vulnerable Components
- [x] Dependency updates automated (Dependabot)
- [x] Regular security audits (`pnpm audit`)
- [x] Known vulnerabilities monitored
- [x] Minimal dependencies

### A07:2021 - Authentication Failures
- [x] MFA available
- [x] Password complexity enforced
- [x] Brute force protection (rate limiting)
- [x] Session management secure
- [x] Token rotation implemented

### A08:2021 - Data Integrity Failures
- [x] Digital signatures for webhooks
- [x] Input validation comprehensive
- [x] Audit logging immutable
- [x] Data integrity checks

### A09:2021 - Logging Failures
- [x] Comprehensive audit logging
- [x] Security event monitoring
- [x] Log retention configured
- [x] Alerts for suspicious activity

### A10:2021 - Server-Side Request Forgery (SSRF)
- [x] URL validation
- [x] Network segmentation
- [x] Whitelist allowed domains
- [x] No user-controlled URLs in requests

## Penetration Testing Checklist

### Authentication Testing
- [ ] Brute force login attempts
- [ ] Password reset flow vulnerabilities
- [ ] Session fixation attacks
- [ ] Token tampering
- [ ] OAuth flow attacks
- [ ] MFA bypass attempts

### Authorization Testing
- [ ] Horizontal privilege escalation (access other org's data)
- [ ] Vertical privilege escalation (elevate permissions)
- [ ] Insecure direct object references (IDOR)
- [ ] Missing function level access control
- [ ] Path traversal attacks

### Data Validation Testing
- [ ] SQL injection
- [ ] XSS (reflected, stored, DOM-based)
- [ ] CSRF attacks
- [ ] Command injection
- [ ] XML/XXE injection
- [ ] File upload vulnerabilities

### Session Testing
- [ ] Session timeout enforcement
- [ ] Session fixation
- [ ] Concurrent session handling
- [ ] Session revocation
- [ ] Cookie security attributes

### API Testing
- [ ] Rate limit bypass
- [ ] Mass assignment
- [ ] API key leakage
- [ ] Excessive data exposure
- [ ] Lack of resources & rate limiting

## Production Deployment Checklist

### Pre-Deployment
- [ ] All security tests passed
- [ ] Security code review completed
- [ ] Staging environment tested
- [ ] Database migrations tested
- [ ] Backup and restore tested
- [ ] Rollback plan documented

### Deployment
- [ ] Blue-green deployment strategy
- [ ] Zero-downtime deployment
- [ ] Health checks configured
- [ ] Monitoring dashboards ready
- [ ] Alerts configured
- [ ] On-call rotation assigned

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Security monitoring active
- [ ] Performance metrics normal
- [ ] Error rates acceptable
- [ ] No security alerts triggered
- [ ] Incident response plan reviewed

## Annual Security Review

### Q1
- [ ] Dependency updates and audits
- [ ] Access control review (remove inactive users)
- [ ] Password policy review
- [ ] Security training for team

### Q2
- [ ] Penetration testing (external)
- [ ] Vulnerability scanning
- [ ] Incident response drill
- [ ] Security documentation update

### Q3
- [ ] Compliance audit (HIPAA)
- [ ] Third-party security review
- [ ] Disaster recovery test
- [ ] Security metrics review

### Q4
- [ ] Security roadmap planning
- [ ] Threat modeling update
- [ ] Security tool evaluation
- [ ] Annual security report

## Security Incident Response

### Preparation
- [ ] Incident response plan documented
- [ ] Incident response team identified
- [ ] Contact lists up to date
- [ ] Communication templates ready

### Detection
- [ ] Monitoring alerts configured
- [ ] Log analysis automated
- [ ] Anomaly detection enabled
- [ ] User reporting mechanism

### Response
- [ ] Incident classification criteria
- [ ] Escalation procedures defined
- [ ] Containment procedures documented
- [ ] Evidence preservation process

### Recovery
- [ ] Service restoration procedures
- [ ] Data recovery tested
- [ ] Customer communication plan
- [ ] Post-incident review process
