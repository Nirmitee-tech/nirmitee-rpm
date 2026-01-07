import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

/**
 * Metrics Service - Prometheus metrics collection
 *
 * Provides:
 * - HTTP request metrics (count, duration, status codes)
 * - Active connections gauge
 * - Business metrics (signups, logins, errors)
 * - Database metrics (query duration, connection pool)
 * - Cache metrics (hits, misses)
 * - Node.js process metrics (memory, CPU, event loop)
 */
class MetricsService {
  public registry: Registry;

  // HTTP Metrics
  public httpRequestsTotal: Counter;
  public httpRequestDuration: Histogram;
  public activeConnections: Gauge;

  // Business Metrics
  public userSignups: Counter;
  public userLogins: Counter;
  public userLoginsFailure: Counter;
  public organizationCreations: Counter;
  public invitationsSent: Counter;
  public mfaEnrollments: Counter;
  public oauthLogins: Counter;

  // Error Metrics
  public errorsTotal: Counter;
  public validationErrorsTotal: Counter;

  // Database Metrics
  public dbQueryDuration: Histogram;
  public dbConnectionPoolSize: Gauge;
  public dbConnectionPoolActive: Gauge;

  // Cache Metrics (Redis)
  public cacheHits: Counter;
  public cacheMisses: Counter;
  public cacheOperationDuration: Histogram;

  // Websocket Metrics
  public wsConnectionsActive: Gauge;
  public wsMessagesTotal: Counter;

  // File Upload Metrics
  public fileUploadsTotal: Counter;
  public fileUploadSize: Histogram;

  constructor() {
    this.registry = new Registry();

    // Collect default Node.js metrics (memory, CPU, event loop, etc.)
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'nirmitee_',
    });

    // HTTP Request Counter
    this.httpRequestsTotal = new Counter({
      name: 'nirmitee_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // HTTP Request Duration Histogram
    this.httpRequestDuration = new Histogram({
      name: 'nirmitee_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    // Active Connections Gauge
    this.activeConnections = new Gauge({
      name: 'nirmitee_active_connections',
      help: 'Number of active HTTP connections',
      registers: [this.registry],
    });

    // Business Metrics
    this.userSignups = new Counter({
      name: 'nirmitee_user_signups_total',
      help: 'Total number of user signups',
      labelNames: ['method'], // 'email', 'oauth'
      registers: [this.registry],
    });

    this.userLogins = new Counter({
      name: 'nirmitee_user_logins_total',
      help: 'Total number of successful user logins',
      labelNames: ['method'], // 'email', 'oauth', 'mfa'
      registers: [this.registry],
    });

    this.userLoginsFailure = new Counter({
      name: 'nirmitee_user_logins_failure_total',
      help: 'Total number of failed login attempts',
      labelNames: ['reason'], // 'invalid_credentials', 'account_locked', 'mfa_failed'
      registers: [this.registry],
    });

    this.organizationCreations = new Counter({
      name: 'nirmitee_organization_creations_total',
      help: 'Total number of organizations created',
      registers: [this.registry],
    });

    this.invitationsSent = new Counter({
      name: 'nirmitee_invitations_sent_total',
      help: 'Total number of invitations sent',
      labelNames: ['type'], // 'organization', 'team'
      registers: [this.registry],
    });

    this.mfaEnrollments = new Counter({
      name: 'nirmitee_mfa_enrollments_total',
      help: 'Total number of MFA enrollments',
      labelNames: ['method'], // 'totp', 'sms'
      registers: [this.registry],
    });

    this.oauthLogins = new Counter({
      name: 'nirmitee_oauth_logins_total',
      help: 'Total number of OAuth logins',
      labelNames: ['provider'], // 'google', 'microsoft', 'github'
      registers: [this.registry],
    });

    // Error Metrics
    this.errorsTotal = new Counter({
      name: 'nirmitee_errors_total',
      help: 'Total number of application errors',
      labelNames: ['type', 'severity'], // type: 'validation', 'database', 'external', severity: 'warning', 'error', 'critical'
      registers: [this.registry],
    });

    this.validationErrorsTotal = new Counter({
      name: 'nirmitee_validation_errors_total',
      help: 'Total number of validation errors',
      labelNames: ['field'],
      registers: [this.registry],
    });

    // Database Metrics
    this.dbQueryDuration = new Histogram({
      name: 'nirmitee_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'model'], // operation: 'findMany', 'create', 'update', 'delete'
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
      registers: [this.registry],
    });

    this.dbConnectionPoolSize = new Gauge({
      name: 'nirmitee_db_connection_pool_size',
      help: 'Size of the database connection pool',
      registers: [this.registry],
    });

    this.dbConnectionPoolActive = new Gauge({
      name: 'nirmitee_db_connection_pool_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });

    // Cache Metrics (Redis)
    this.cacheHits = new Counter({
      name: 'nirmitee_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['key_prefix'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'nirmitee_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['key_prefix'],
      registers: [this.registry],
    });

    this.cacheOperationDuration = new Histogram({
      name: 'nirmitee_cache_operation_duration_seconds',
      help: 'Duration of cache operations in seconds',
      labelNames: ['operation'], // 'get', 'set', 'delete'
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
      registers: [this.registry],
    });

    // Websocket Metrics
    this.wsConnectionsActive = new Gauge({
      name: 'nirmitee_ws_connections_active',
      help: 'Number of active WebSocket connections',
      registers: [this.registry],
    });

    this.wsMessagesTotal = new Counter({
      name: 'nirmitee_ws_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['direction', 'event'], // direction: 'inbound', 'outbound'
      registers: [this.registry],
    });

    // File Upload Metrics
    this.fileUploadsTotal = new Counter({
      name: 'nirmitee_file_uploads_total',
      help: 'Total number of file uploads',
      labelNames: ['type', 'status'], // type: 'image', 'document', 'video', status: 'success', 'failure'
      registers: [this.registry],
    });

    this.fileUploadSize = new Histogram({
      name: 'nirmitee_file_upload_size_bytes',
      help: 'Size of uploaded files in bytes',
      labelNames: ['type'],
      buckets: [1024, 10240, 102400, 1024000, 10240000, 104857600], // 1KB to 100MB
      registers: [this.registry],
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number
  ): void {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
    };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationSeconds);
  }

  /**
   * Increment active connections
   */
  incrementActiveConnections(): void {
    this.activeConnections.inc();
  }

  /**
   * Decrement active connections
   */
  decrementActiveConnections(): void {
    this.activeConnections.dec();
  }

  /**
   * Record database query metrics
   */
  recordDbQuery(operation: string, model: string, durationSeconds: number): void {
    this.dbQueryDuration.observe({ operation, model }, durationSeconds);
  }

  /**
   * Record cache hit
   */
  recordCacheHit(keyPrefix: string): void {
    this.cacheHits.inc({ key_prefix: keyPrefix });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(keyPrefix: string): void {
    this.cacheMisses.inc({ key_prefix: keyPrefix });
  }

  /**
   * Record cache operation duration
   */
  recordCacheOperation(operation: string, durationSeconds: number): void {
    this.cacheOperationDuration.observe({ operation }, durationSeconds);
  }

  /**
   * Record user signup
   */
  recordUserSignup(method: string): void {
    this.userSignups.inc({ method });
  }

  /**
   * Record user login success
   */
  recordUserLogin(method: string): void {
    this.userLogins.inc({ method });
  }

  /**
   * Record user login failure
   */
  recordLoginFailure(reason: string): void {
    this.userLoginsFailure.inc({ reason });
  }

  /**
   * Record organization creation
   */
  recordOrganizationCreation(): void {
    this.organizationCreations.inc();
  }

  /**
   * Record invitation sent
   */
  recordInvitationSent(type: string): void {
    this.invitationsSent.inc({ type });
  }

  /**
   * Record MFA enrollment
   */
  recordMfaEnrollment(method: string): void {
    this.mfaEnrollments.inc({ method });
  }

  /**
   * Record OAuth login
   */
  recordOauthLogin(provider: string): void {
    this.oauthLogins.inc({ provider });
  }

  /**
   * Record application error
   */
  recordError(type: string, severity: string): void {
    this.errorsTotal.inc({ type, severity });
  }

  /**
   * Record validation error
   */
  recordValidationError(field: string): void {
    this.validationErrorsTotal.inc({ field });
  }

  /**
   * Record WebSocket connection change
   */
  setWsConnections(count: number): void {
    this.wsConnectionsActive.set(count);
  }

  /**
   * Record WebSocket message
   */
  recordWsMessage(direction: string, event: string): void {
    this.wsMessagesTotal.inc({ direction, event });
  }

  /**
   * Record file upload
   */
  recordFileUpload(type: string, status: string, sizeBytes?: number): void {
    this.fileUploadsTotal.inc({ type, status });
    if (sizeBytes && status === 'success') {
      this.fileUploadSize.observe({ type }, sizeBytes);
    }
  }

  /**
   * Set database connection pool metrics
   */
  setDbConnectionPool(size: number, active: number): void {
    this.dbConnectionPoolSize.set(size);
    this.dbConnectionPoolActive.set(active);
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

// Singleton instance
export const metricsService = new MetricsService();
