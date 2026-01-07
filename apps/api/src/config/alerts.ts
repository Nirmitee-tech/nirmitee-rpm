/**
 * Alerting Configuration
 *
 * Defines alert thresholds and rules for monitoring critical metrics.
 * Alerts can be sent via email, Slack, or other channels.
 */

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'above' | 'below' | 'equals';
  threshold: number;
  duration: number; // seconds - how long condition must persist before alerting
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook';
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * Default alert rules
 */
export const defaultAlertRules: AlertRule[] = [
  // Error Rate Alerts
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    description: 'Error rate exceeds threshold',
    metric: 'error_rate',
    condition: 'above',
    threshold: 5, // 5% error rate
    duration: 300, // 5 minutes
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'elevated-error-rate',
    name: 'Elevated Error Rate',
    description: 'Error rate is elevated',
    metric: 'error_rate',
    condition: 'above',
    threshold: 2, // 2% error rate
    duration: 600, // 10 minutes
    severity: 'warning',
    enabled: true,
  },

  // Latency Alerts
  {
    id: 'high-latency',
    name: 'High API Latency',
    description: 'API response time is too slow',
    metric: 'latency_p95',
    condition: 'above',
    threshold: 2000, // 2 seconds
    duration: 300, // 5 minutes
    severity: 'warning',
    enabled: true,
  },
  {
    id: 'critical-latency',
    name: 'Critical API Latency',
    description: 'API response time is critically slow',
    metric: 'latency_p95',
    condition: 'above',
    threshold: 5000, // 5 seconds
    duration: 180, // 3 minutes
    severity: 'critical',
    enabled: true,
  },

  // Database Alerts
  {
    id: 'database-down',
    name: 'Database Unavailable',
    description: 'Database is not responding',
    metric: 'database_status',
    condition: 'equals',
    threshold: 0, // 0 = down
    duration: 60, // 1 minute
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'slow-database-queries',
    name: 'Slow Database Queries',
    description: 'Database queries are slow',
    metric: 'db_query_duration_p95',
    condition: 'above',
    threshold: 500, // 500ms
    duration: 300, // 5 minutes
    severity: 'warning',
    enabled: true,
  },

  // Redis Alerts
  {
    id: 'redis-down',
    name: 'Redis Unavailable',
    description: 'Redis cache is not responding',
    metric: 'redis_status',
    condition: 'equals',
    threshold: 0, // 0 = down
    duration: 300, // 5 minutes (not critical, we can operate without cache)
    severity: 'warning',
    enabled: true,
  },

  // Memory Alerts
  {
    id: 'high-memory-usage',
    name: 'High Memory Usage',
    description: 'Memory usage is high',
    metric: 'memory_percentage',
    condition: 'above',
    threshold: 85, // 85%
    duration: 600, // 10 minutes
    severity: 'warning',
    enabled: true,
  },
  {
    id: 'critical-memory-usage',
    name: 'Critical Memory Usage',
    description: 'Memory usage is critically high',
    metric: 'memory_percentage',
    condition: 'above',
    threshold: 95, // 95%
    duration: 300, // 5 minutes
    severity: 'critical',
    enabled: true,
  },

  // Failed Login Alerts (Security)
  {
    id: 'excessive-failed-logins',
    name: 'Excessive Failed Login Attempts',
    description: 'High number of failed login attempts detected',
    metric: 'failed_login_rate',
    condition: 'above',
    threshold: 10, // 10 failed logins per minute
    duration: 120, // 2 minutes
    severity: 'warning',
    enabled: true,
  },
];

/**
 * Get alert configuration from environment
 */
export function getAlertConfig() {
  return {
    enabled: process.env.ALERTS_ENABLED !== 'false',
    checkInterval: parseInt(process.env.ALERT_CHECK_INTERVAL || '60', 10), // seconds
    channels: getAlertChannels(),
    rules: getAlertRules(),
  };
}

/**
 * Get configured alert channels
 */
function getAlertChannels(): AlertChannel[] {
  const channels: AlertChannel[] = [];

  // Email channel
  if (process.env.ALERT_EMAIL_RECIPIENTS) {
    channels.push({
      type: 'email',
      enabled: true,
      config: {
        recipients: process.env.ALERT_EMAIL_RECIPIENTS.split(',').map((email) => email.trim()),
        from: process.env.SMTP_FROM || 'alerts@nirmiteerpm.local',
      },
    });
  }

  // Slack channel
  if (process.env.ALERT_SLACK_WEBHOOK) {
    channels.push({
      type: 'slack',
      enabled: true,
      config: {
        webhookUrl: process.env.ALERT_SLACK_WEBHOOK,
        channel: process.env.ALERT_SLACK_CHANNEL,
        username: process.env.ALERT_SLACK_USERNAME || 'NirmiteeRPM Alerts',
        iconEmoji: process.env.ALERT_SLACK_ICON_EMOJI || ':warning:',
      },
    });
  }

  // Custom webhook channel
  if (process.env.ALERT_WEBHOOK_URL) {
    channels.push({
      type: 'webhook',
      enabled: true,
      config: {
        url: process.env.ALERT_WEBHOOK_URL,
        method: process.env.ALERT_WEBHOOK_METHOD || 'POST',
        headers: process.env.ALERT_WEBHOOK_HEADERS
          ? JSON.parse(process.env.ALERT_WEBHOOK_HEADERS)
          : { 'Content-Type': 'application/json' },
      },
    });
  }

  return channels;
}

/**
 * Get alert rules (merge default with custom)
 */
function getAlertRules(): AlertRule[] {
  // Start with default rules
  let rules = [...defaultAlertRules];

  // Allow disabling specific rules via environment
  const disabledRules = process.env.ALERT_DISABLED_RULES?.split(',').map((id) => id.trim()) || [];
  rules = rules.map((rule) => ({
    ...rule,
    enabled: rule.enabled && !disabledRules.includes(rule.id),
  }));

  // TODO: Load custom rules from database or config file

  return rules;
}
