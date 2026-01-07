# Incident Response Runbook

## Incident Severity Levels

### P0 - Critical
- Complete service outage
- Data breach or security incident
- Database corruption
- Response time: Immediate (15 min)

### P1 - High
- Major feature unavailable
- Significant performance degradation
- Authentication issues
- Response time: 1 hour

### P2 - Medium
- Minor feature unavailable
- Non-critical performance issue
- Response time: 4 hours

### P3 - Low
- Cosmetic issues
- Minor bugs
- Response time: Next business day

## Incident Response Process

### 1. Detection & Triage (5 min)
- Alert received or issue reported
- Assign incident commander
- Determine severity level
- Create incident channel (Slack)
- Page on-call engineer if P0/P1

### 2. Initial Assessment (10 min)
- Review monitoring dashboards
- Check recent deployments
- Review error logs
- Identify affected systems
- Estimate user impact

### 3. Communication (Ongoing)
- Post status update (status page)
- Notify stakeholders
- Update every 30 min (P0), 2 hours (P1)
- Use incident channel for all comms

### 4. Investigation (Variable)
- Gather diagnostic information
- Reproduce issue if possible
- Check database, cache, API logs
- Review recent changes

### 5. Mitigation (Variable)
- Implement temporary fix
- Deploy hotfix if needed
- Rollback deployment if necessary
- Scale resources if capacity issue

### 6. Resolution (Variable)
- Verify fix in production
- Monitor for recurrence
- Update status page
- Notify stakeholders

### 7. Post-Incident Review (Within 48h)
- Write incident report
- Conduct blameless postmortem
- Identify root cause
- Create action items
- Update runbooks

## Common Incidents

### Database Connection Pool Exhausted

**Symptoms:**
- "Unable to connect to database" errors
- Timeout errors
- 500 errors on API

**Diagnosis:**
```bash
# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection pool
redis-cli
> KEYS "prisma:*"
```

**Resolution:**
```bash
# Increase connection pool
# Update DATABASE_URL: ?connection_limit=50

# Restart API pods
kubectl rollout restart deployment/nirmitee-api

# Long-term: Optimize queries, add connection pooler (PgBouncer)
```

### Redis Connection Failures

**Symptoms:**
- Session errors
- Cache misses
- WebSocket disconnect

**Diagnosis:**
```bash
# Check Redis health
redis-cli ping

# Check memory usage
redis-cli info memory
```

**Resolution:**
```bash
# Restart Redis (if managed)
# Or failover to replica

# Clear cache if corrupted
redis-cli FLUSHDB

# Restart API to reconnect
kubectl rollout restart deployment/nirmitee-api
```

### High API Error Rate

**Symptoms:**
- Spike in 500 errors
- Error alerts firing

**Diagnosis:**
```bash
# Check error logs
kubectl logs -f deployment/nirmitee-api | grep ERROR

# Check recent deployments
kubectl rollout history deployment/nirmitee-api
```

**Resolution:**
```bash
# If caused by recent deployment, rollback
kubectl rollout undo deployment/nirmitee-api

# Monitor error rate
# Check Grafana dashboard
```

### Slow Database Queries

**Symptoms:**
- High response times
- Timeout errors
- Database CPU high

**Diagnosis:**
```sql
-- Find slow queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**Resolution:**
```sql
-- Kill long-running query (if needed)
SELECT pg_terminate_backend(pid);

-- Add missing index (if identified)
CREATE INDEX CONCURRENTLY idx_name ON table(column);
```

### Memory Leak

**Symptoms:**
- Gradual memory increase
- Pods being OOMKilled
- Slow performance

**Diagnosis:**
```bash
# Check memory usage
kubectl top pods

# Get heap dump (Node.js)
kubectl exec -it pod-name -- kill -USR2 $(pidof node)
```

**Resolution:**
```bash
# Immediate: Restart pods
kubectl rollout restart deployment/nirmitee-api

# Long-term: Analyze heap dump
# Fix memory leak in code
```

### WebSocket Connection Storm

**Symptoms:**
- High number of WebSocket connections
- Server resource exhaustion

**Diagnosis:**
```bash
# Check active connections
kubectl exec -it pod-name -- netstat -an | grep ESTABLISHED | wc -l
```

**Resolution:**
```bash
# Rate limit WebSocket connections
# Add connection limits in Socket.io config

# Scale up pods temporarily
kubectl scale deployment/nirmitee-api --replicas=10
```

### Authentication Token Expired for All Users

**Symptoms:**
- Mass 401 errors
- All users logged out

**Diagnosis:**
```bash
# Check JWT secret changed
# Check token expiration

# Verify session storage (Redis)
redis-cli
> KEYS "session:*"
```

**Resolution:**
```bash
# If JWT secret changed accidentally, revert
# If Redis flushed, users must re-login

# Communication: Notify users of required re-login
```

## Contact List

### On-Call Rotation
- Primary: [PagerDuty rotation]
- Secondary: [Backup engineer]
- Database: [DBA contact]
- Security: security@nirmitee.io

### Escalation
- Engineering Lead: [Phone]
- CTO: [Phone]
- CEO: [Phone] (P0 only)

## Communication Templates

### Status Page Update (Outage)
```
We are currently experiencing issues with [service]. Our team is actively investigating. We will provide updates every 30 minutes.
```

### Status Page Update (Resolved)
```
The issue with [service] has been resolved. All systems are operating normally. We apologize for the inconvenience.
```

### Customer Email (Postmortem)
```
Subject: Incident Report - [Date]

We experienced an outage on [date] affecting [service].

What happened:
[Brief description]

Impact:
[User impact, duration]

Root cause:
[Technical cause]

Remediation:
[What we fixed]

Prevention:
[What we're doing to prevent recurrence]

We sincerely apologize for the disruption.
```

## Incident Report Template
```markdown
# Incident Report: [Title]

**Date:** YYYY-MM-DD
**Severity:** P0/P1/P2/P3
**Duration:** XX hours XX minutes
**Impact:** [User impact description]

## Timeline
- HH:MM - Issue detected
- HH:MM - Incident declared
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

## Root Cause
[Technical explanation]

## Resolution
[What was done to fix]

## Action Items
- [ ] Action 1 (Owner: Person, Due: Date)
- [ ] Action 2 (Owner: Person, Due: Date)

## Lessons Learned
[What we learned and will improve]
```
