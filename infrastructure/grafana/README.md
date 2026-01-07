# Grafana Dashboard Configuration

This directory contains pre-configured Grafana dashboards for monitoring NirmiteeRPM API.

## Prerequisites

1. **Prometheus** - Collecting metrics from `/metrics` endpoint
2. **Grafana** - Visualizing metrics
3. **API running with metrics enabled** - Prometheus endpoint exposed

## Setup Instructions

### 1. Install Prometheus

```bash
# Using Docker
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### 2. Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'nirmitee-api'
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/metrics'
```

### 3. Install Grafana

```bash
# Using Docker
docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

### 4. Add Prometheus Data Source

1. Open Grafana at http://localhost:3000
2. Default login: admin/admin
3. Go to Configuration → Data Sources
4. Add Prometheus data source
5. URL: http://localhost:9090 (or your Prometheus URL)
6. Save & Test

### 5. Import Dashboard

1. Go to Dashboards → Import
2. Upload `dashboards/api-dashboard.json`
3. Select Prometheus data source
4. Click Import

## Dashboard Panels

### HTTP Metrics
- **Request Rate**: Requests per second by method and route
- **Error Rate**: Percentage of 5xx errors
- **Response Time**: P50, P95, P99 latency percentiles
- **Active Connections**: Current HTTP connections

### Database Metrics
- **Database Query Duration**: P95 query time by operation
- **Cache Hit Rate**: Redis cache effectiveness

### System Metrics
- **Memory Usage**: Heap and RSS memory
- **CPU Usage**: Process CPU utilization

### Business Metrics
- **User Signups**: Registration rate by method
- **User Logins**: Success and failure rates
- **WebSocket Connections**: Active real-time connections
- **Error Types**: Breakdown of errors by type and severity

## Alerts

The dashboard includes preconfigured alerts:

1. **High Error Rate** - Triggers when error rate > 5%
2. **High Latency** - Triggers when P95 > 2s
3. **Slow Database Queries** - Triggers when P95 > 500ms

### Configuring Alert Notifications

1. Go to Alerting → Notification channels
2. Add channels (email, Slack, PagerDuty, etc.)
3. Edit alert rules to use your channels

## Metrics Reference

All metrics are prefixed with `nirmitee_`:

### HTTP Metrics
- `nirmitee_http_requests_total` - Total HTTP requests
- `nirmitee_http_request_duration_seconds` - Request duration histogram
- `nirmitee_active_connections` - Active HTTP connections

### Business Metrics
- `nirmitee_user_signups_total` - User signups counter
- `nirmitee_user_logins_total` - Successful logins counter
- `nirmitee_user_logins_failure_total` - Failed logins counter
- `nirmitee_organization_creations_total` - Organization creations
- `nirmitee_invitations_sent_total` - Invitations sent
- `nirmitee_mfa_enrollments_total` - MFA enrollments
- `nirmitee_oauth_logins_total` - OAuth logins by provider

### Database Metrics
- `nirmitee_db_query_duration_seconds` - Database query duration histogram
- `nirmitee_db_connection_pool_size` - Connection pool size
- `nirmitee_db_connection_pool_active` - Active connections

### Cache Metrics
- `nirmitee_cache_hits_total` - Cache hits counter
- `nirmitee_cache_misses_total` - Cache misses counter
- `nirmitee_cache_operation_duration_seconds` - Cache operation duration

### Error Metrics
- `nirmitee_errors_total` - Total errors by type and severity
- `nirmitee_validation_errors_total` - Validation errors by field

### WebSocket Metrics
- `nirmitee_ws_connections_active` - Active WebSocket connections
- `nirmitee_ws_messages_total` - WebSocket messages by direction

### File Upload Metrics
- `nirmitee_file_uploads_total` - File uploads by type and status
- `nirmitee_file_upload_size_bytes` - File upload sizes histogram

## Production Recommendations

1. **Retention Policy**: Configure Prometheus retention (default 15 days)
2. **High Availability**: Run multiple Prometheus/Grafana instances
3. **Backup**: Regularly backup Grafana dashboards
4. **Alert Routing**: Configure proper alert channels for on-call teams
5. **Access Control**: Restrict Grafana access with proper authentication

## Troubleshooting

### No data in Grafana

1. Check Prometheus is scraping: http://localhost:9090/targets
2. Verify API metrics endpoint: http://localhost:4000/metrics
3. Check Prometheus data source in Grafana
4. Review time range in dashboard (try "Last 5 minutes")

### Metrics not appearing

1. Ensure metrics are being recorded (check code instrumentation)
2. Wait for scrape interval (default 15s)
3. Check Prometheus logs for scrape errors

### High cardinality warnings

Reduce label cardinality:
- Limit number of unique route patterns
- Group similar operations
- Use sampling for high-volume metrics

## Custom Dashboards

Create your own dashboards using PromQL queries:

```promql
# Average response time by route
avg(rate(nirmitee_http_request_duration_seconds_sum[5m])) by (route)

# Error rate percentage
rate(nirmitee_http_requests_total{status_code=~"5.."}[5m])
  / rate(nirmitee_http_requests_total[5m]) * 100

# Top 10 slowest routes
topk(10, histogram_quantile(0.95,
  rate(nirmitee_http_request_duration_seconds_bucket[5m])) by (route))
```

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Alerting](https://grafana.com/docs/grafana/latest/alerting/)
