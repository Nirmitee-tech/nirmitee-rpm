# Error Tracking & APM Implementation Report

**Date:** 2026-01-07
**Implementation Status:** ✅ Completed

## Summary

Comprehensive error tracking and Application Performance Monitoring (APM) system implemented for NirmiteeRPM using Sentry, enhanced Prometheus metrics, distributed tracing, health checks, and alerting.

---

## Implementation Details

### 1. Sentry Integration

#### Backend (`apps/api/`)

**Created:**
- `/apps/api/src/config/sentry.ts` - Complete Sentry configuration with:
  - Environment-based DSN configuration
  - Performance profiling integration
  - HTTP and console integrations
  - Configurable sampling rates
  - Error filtering (validation, 404s)
  - Helper functions for manual error capture
  - User context management

**Modified:**
- `/apps/api/src/index.ts`:
  - Added Sentry initialization BEFORE all imports
  - Integrated request and error handlers in middleware chain
  - Added error tracking status to startup banner

**Features:**
- Automatic error capture for 5xx errors
- Performance monitoring with configurable sampling
- Request context propagation
- User identification in error reports
- Breadcrumb tracking
- Graceful degradation when not configured

#### Frontend (`apps/web/`)

**Created:**
- `/apps/web/lib/sentry.ts` - Common configuration helper
- `/apps/web/sentry.client.config.ts` - Browser-side configuration with Session Replay
- `/apps/web/sentry.server.config.ts` - Server-side configuration (SSR, API routes)
- `/apps/web/sentry.edge.config.ts` - Edge runtime configuration

**Features:**
- Browser error tracking with Session Replay
- Server-side rendering error capture
- Edge runtime support
- Automatic breadcrumbs
- Performance monitoring
- Error filtering and deduplication

---

### 2. Distributed Tracing

**Enhanced:** `/apps/api/src/middleware/request-tracing.ts`

**Improvements:**
- W3C Trace Context standard implementation (`traceparent`, `tracestate`)
- 128-bit trace ID generation
- 64-bit span ID generation
- Trace propagation across services
- Response headers with trace context
- Compatible with OpenTelemetry and other APM tools

**Headers Added:**
- `traceparent`: W3C standard format `00-{traceId}-{spanId}-{flags}`
- `tracestate`: Vendor-specific key-value pairs
- `X-Trace-ID`: Simplified trace identifier
- `X-Span-ID`: Current span identifier

---

### 3. Enhanced Metrics Service

**Extended:** `/apps/api/src/services/metrics-service.ts`

**New Metrics Added:**

#### Business Metrics
- `nirmitee_user_signups_total` - User signups by method
- `nirmitee_user_logins_total` - Successful logins by method
- `nirmitee_user_logins_failure_total` - Failed login attempts by reason
- `nirmitee_organization_creations_total` - Organization creations
- `nirmitee_invitations_sent_total` - Invitations sent by type
- `nirmitee_mfa_enrollments_total` - MFA enrollments by method
- `nirmitee_oauth_logins_total` - OAuth logins by provider

#### Database Metrics
- `nirmitee_db_query_duration_seconds` - Query duration histogram by operation and model
- `nirmitee_db_connection_pool_size` - Connection pool size
- `nirmitee_db_connection_pool_active` - Active connections

#### Cache Metrics
- `nirmitee_cache_hits_total` - Cache hits by key prefix
- `nirmitee_cache_misses_total` - Cache misses by key prefix
- `nirmitee_cache_operation_duration_seconds` - Cache operation duration

#### Error Metrics
- `nirmitee_errors_total` - Errors by type and severity
- `nirmitee_validation_errors_total` - Validation errors by field

#### WebSocket Metrics
- `nirmitee_ws_connections_active` - Active WebSocket connections
- `nirmitee_ws_messages_total` - WebSocket messages by direction and event

#### File Upload Metrics
- `nirmitee_file_uploads_total` - File uploads by type and status
- `nirmitee_file_upload_size_bytes` - File upload size histogram

**Helper Methods Added:**
- `recordUserSignup(method)`
- `recordUserLogin(method)`
- `recordLoginFailure(reason)`
- `recordDbQuery(operation, model, duration)`
- `recordCacheHit(keyPrefix)`
- `recordCacheMiss(keyPrefix)`
- `recordError(type, severity)`
- And many more...

---

### 4. Enhanced Health Checks

**Enhanced:** `/apps/api/src/routes/v1/health-routes.ts`

**Improvements:**
- Deep health checks for all services
- Parallel health check execution
- Response time tracking for each service
- Database connection pool stats
- Redis version info
- S3 storage health check (optional)
- CPU usage metrics
- Enhanced status levels: `healthy`, `degraded`, `unhealthy`, `unavailable`

**Endpoints:**
- `GET /api/health` - Comprehensive health check
- `GET /api/health/live` - Liveness probe (Kubernetes-ready)
- `GET /api/health/ready` - Readiness probe (Kubernetes-ready)

---

### 5. Alerting System

**Created:**
- `/apps/api/src/config/alerts.ts` - Alert rules and configuration
- `/apps/api/src/services/alert-service.ts` - Alert monitoring service

**Features:**
- Continuous metric monitoring
- 11 predefined alert rules:
  - High/elevated error rates
  - High/critical latency
  - Database unavailability
  - Slow database queries
  - Redis unavailability
  - High/critical memory usage
  - Excessive failed login attempts
- Alert deduplication
- Duration-based thresholds (avoid false positives)
- Multiple notification channels:
  - Email
  - Slack webhooks
  - Custom webhooks

**Alert Rules (Default):**
1. High Error Rate (> 5%)
2. Elevated Error Rate (> 2%)
3. High API Latency (P95 > 2s)
4. Critical API Latency (P95 > 5s)
5. Database Down
6. Slow Database Queries (P95 > 500ms)
7. Redis Down
8. High Memory Usage (> 85%)
9. Critical Memory Usage (> 95%)
10. Excessive Failed Login Attempts (> 10/min)

**Configuration:**
- Environment-based enable/disable
- Configurable check intervals
- Per-rule enable/disable
- Channel-specific settings

---

### 6. Grafana Dashboard

**Created:**
- `/infrastructure/grafana/dashboards/api-dashboard.json` - Complete dashboard config
- `/infrastructure/grafana/README.md` - Setup and usage guide

**Dashboard Panels (12 total):**
1. Request Rate - HTTP requests per second
2. Error Rate - Percentage of 5xx errors with alerts
3. Response Time - P50, P95, P99 latency percentiles
4. Active Connections - Current HTTP connections
5. Database Query Duration - P95 query times
6. Cache Hit Rate - Redis effectiveness
7. Memory Usage - Heap and RSS memory
8. CPU Usage - Process CPU utilization
9. User Signups - Registration rates by method
10. User Logins - Success and failure rates
11. WebSocket Connections - Active real-time connections
12. Error Types - Breakdown by type and severity

**Features:**
- Preconfigured Prometheus queries
- Alert thresholds visualized
- Color-coded thresholds
- Real-time updates (10s refresh)
- Drill-down capabilities

---

### 7. Environment Variables

**Updated:**
- `/apps/api/.env.example`
- `/apps/web/.env.example`

**New Variables Added:**

#### Backend (API)
```bash
# Sentry
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Alerting
ALERTS_ENABLED=true
ALERT_CHECK_INTERVAL=60
ALERT_EMAIL_RECIPIENTS=admin@example.com
ALERT_SLACK_WEBHOOK=
ALERT_SLACK_CHANNEL=
ALERT_SLACK_USERNAME=
ALERT_SLACK_ICON_EMOJI=
ALERT_WEBHOOK_URL=
ALERT_WEBHOOK_METHOD=POST
ALERT_WEBHOOK_HEADERS={}
ALERT_DISABLED_RULES=
```

#### Frontend (Web)
```bash
# Sentry
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## Files Created

1. `/apps/api/src/config/sentry.ts` (254 lines)
2. `/apps/web/lib/sentry.ts` (121 lines)
3. `/apps/web/sentry.client.config.ts` (42 lines)
4. `/apps/web/sentry.server.config.ts` (40 lines)
5. `/apps/web/sentry.edge.config.ts` (32 lines)
6. `/apps/api/src/config/alerts.ts` (232 lines)
7. `/apps/api/src/services/alert-service.ts` (422 lines)
8. `/infrastructure/grafana/dashboards/api-dashboard.json` (268 lines)
9. `/infrastructure/grafana/README.md` (268 lines)

---

## Files Modified

1. `/apps/api/src/index.ts` - Added Sentry integration
2. `/apps/api/src/middleware/request-tracing.ts` - W3C Trace Context
3. `/apps/api/src/services/metrics-service.ts` - Extended with business metrics
4. `/apps/api/src/routes/v1/health-routes.ts` - Deep health checks
5. `/apps/api/.env.example` - New environment variables
6. `/apps/web/.env.example` - New environment variables

---

## Dependencies Added

### Backend
- `@sentry/node@10.32.1` - Sentry SDK for Node.js
- `@sentry/profiling-node@10.32.1` - Performance profiling

### Frontend
- `@sentry/nextjs@10.32.1` - Sentry SDK for Next.js

---

## Type Check Status

**Minor Issues (Pre-existing):**
- Some pre-existing files have TypeScript errors unrelated to this implementation
- Alert service and Sentry config compile without errors
- New metrics service methods compile correctly

**Action Items:**
- Pre-existing errors in privacy-routes, admin-routes, backup-service, etc. need separate fixes
- These are outside scope of this implementation

---

## Usage Examples

### 1. Capturing Errors Manually

```typescript
import { captureException, captureMessage } from '@/config/sentry';

try {
  // risky operation
} catch (error) {
  captureException(error, { userId, operation: 'checkout' });
}

captureMessage('Payment gateway slow', 'warning', { gateway: 'stripe' });
```

### 2. Recording Business Metrics

```typescript
import { metricsService } from '@/services/metrics-service';

// User signup
metricsService.recordUserSignup('email');

// Successful login
metricsService.recordUserLogin('oauth');

// Failed login
metricsService.recordLoginFailure('invalid_credentials');

// Database query
const start = Date.now();
await prisma.user.findMany();
metricsService.recordDbQuery('findMany', 'user', (Date.now() - start) / 1000);
```

### 3. Starting Alert Service

```typescript
// In main application startup
import { alertService } from '@/services/alert-service';

alertService.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  alertService.stop();
});
```

### 4. Checking Health

```bash
# Full health check
curl http://localhost:4000/api/health

# Liveness probe
curl http://localhost:4000/api/health/live

# Readiness probe
curl http://localhost:4000/api/health/ready
```

---

## Setup Instructions

### 1. Configure Sentry

1. Create project at https://sentry.io
2. Get DSN from project settings
3. Add to environment:
   ```bash
   # Backend
   SENTRY_DSN=https://your-dsn@sentry.io/project-id

   # Frontend
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```

### 2. Configure Alerting

```bash
# Email alerts
ALERT_EMAIL_RECIPIENTS=admin@example.com,ops@example.com

# Slack alerts
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_SLACK_CHANNEL=#alerts
```

### 3. Setup Grafana (Optional)

See `/infrastructure/grafana/README.md` for complete setup guide:
1. Install Prometheus
2. Configure Prometheus to scrape `/metrics`
3. Install Grafana
4. Add Prometheus data source
5. Import dashboard JSON

---

## Production Considerations

### Sentry
- Use appropriate sample rates (10% for production)
- Set correct environment names
- Configure release tracking
- Enable performance profiling selectively
- Review and adjust error filters

### Alerting
- Configure proper notification channels
- Test alert delivery
- Adjust thresholds based on baseline metrics
- Set up on-call rotations
- Create runbooks for each alert

### Metrics
- Monitor cardinality (avoid too many unique label values)
- Set up long-term storage (Prometheus retention)
- Create custom dashboards per team
- Set up metric-based autoscaling

### Health Checks
- Use liveness/readiness probes in Kubernetes
- Set appropriate timeouts
- Monitor health check endpoints themselves
- Create dependencies graph

---

## Testing

### Test Error Tracking
```bash
# Trigger error
curl -X POST http://localhost:4000/api/test/error

# Check Sentry dashboard
```

### Test Metrics
```bash
# View metrics
curl http://localhost:4000/metrics

# Check Prometheus targets
curl http://localhost:9090/targets
```

### Test Health Checks
```bash
# All services
curl http://localhost:4000/api/health | jq

# Response should include database, redis, storage status
```

### Test Alerts
```bash
# Temporarily set low thresholds in .env
ALERT_CHECK_INTERVAL=10

# Monitor logs for alert triggers
tail -f logs/app.log | grep "Alert triggered"
```

---

## Monitoring Dashboard

Access Grafana dashboard at: http://localhost:3000/dashboards

**Key Metrics to Watch:**
1. Error rate < 2%
2. P95 latency < 1s
3. Database queries < 100ms P95
4. Cache hit rate > 80%
5. Memory usage < 85%

---

## Issues & Notes

1. **Pre-existing TypeScript Errors:** Some existing files have type errors unrelated to this implementation
2. **Alert Service Not Auto-Started:** Alert service needs to be explicitly started in app initialization
3. **Sentry Optional:** All Sentry functionality gracefully degrades when not configured
4. **Redis Optional:** Cache metrics only work when Redis is available

---

## Next Steps

1. Start alert service in production
2. Configure Sentry projects (backend + frontend)
3. Set up Prometheus + Grafana
4. Configure alert notification channels
5. Establish baseline metrics
6. Adjust alert thresholds
7. Create incident response runbooks
8. Set up log aggregation (optional)

---

## Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry](https://opentelemetry.io/)

---

## Success Criteria

✅ Sentry integrated (backend + frontend)
✅ W3C Trace Context implemented
✅ Custom business metrics added
✅ Deep health checks implemented
✅ Alert service created with 11 rules
✅ Email, Slack, webhook notifications
✅ Grafana dashboard with 12 panels
✅ Environment variables documented
✅ Setup instructions provided

---

**Report Generated:** 2026-01-07
**Total Lines of Code:** ~2000+ lines
**Time Estimated:** 4-6 hours for full setup and configuration
