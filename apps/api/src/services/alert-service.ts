import { getAlertConfig, AlertRule, AlertChannel } from '../config/alerts';
import { metricsService } from './metrics-service';
import { emailService } from './email-service';
import logger from '../utils/logger';

/**
 * Alert Service - Monitor metrics and trigger alerts
 *
 * Features:
 * - Continuous monitoring of metrics against alert rules
 * - Alert deduplication (don't send duplicate alerts)
 * - Multiple notification channels (email, Slack, webhook)
 * - Alert history tracking
 */

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

interface MetricSnapshot {
  error_rate: number;
  latency_p95: number;
  database_status: number;
  redis_status: number;
  memory_percentage: number;
  db_query_duration_p95: number;
  failed_login_rate: number;
}

class AlertService {
  private activeAlerts: Map<string, Alert>;
  private alertHistory: Alert[];
  private ruleViolationStart: Map<string, Date>;
  private monitoringInterval?: NodeJS.Timeout;
  private config = getAlertConfig();

  constructor() {
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.ruleViolationStart = new Map();
  }

  /**
   * Start monitoring metrics for alerts
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info('Alert service is disabled');
      return;
    }

    if (this.monitoringInterval) {
      logger.warn('Alert service is already running');
      return;
    }

    logger.info('Starting alert service', {
      checkInterval: this.config.checkInterval,
      enabledRules: this.config.rules.filter((r) => r.enabled).length,
      channels: this.config.channels.length,
    });

    // Check metrics immediately
    this.checkMetrics();

    // Schedule periodic checks
    this.monitoringInterval = setInterval(() => {
      this.checkMetrics();
    }, this.config.checkInterval * 1000);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      logger.info('Alert service stopped');
    }
  }

  /**
   * Check all metrics against alert rules
   */
  private async checkMetrics(): Promise<void> {
    try {
      // Get current metric values
      const metrics = await this.getCurrentMetrics();

      // Check each enabled rule
      for (const rule of this.config.rules.filter((r) => r.enabled)) {
        await this.checkRule(rule, metrics);
      }
    } catch (error) {
      logger.error('Error checking metrics for alerts', { error });
    }
  }

  /**
   * Get current metric values
   */
  private async getCurrentMetrics(): Promise<MetricSnapshot> {
    // Get Prometheus metrics
    const metricsText = await metricsService.getMetrics();

    // Parse metrics (simplified - in production use promClient's parser)
    const errorRate = this.parseMetric(metricsText, 'nirmitee_http_requests_total', 'status_code', '5');
    const totalRequests = this.parseMetric(metricsText, 'nirmitee_http_requests_total');
    const latency = this.parseMetric(metricsText, 'nirmitee_http_request_duration_seconds', undefined, undefined, 0.95);

    return {
      error_rate: totalRequests > 0 ? (errorRate / totalRequests) * 100 : 0,
      latency_p95: latency * 1000, // Convert to ms
      database_status: 1, // Would come from health check
      redis_status: 1, // Would come from health check
      memory_percentage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100,
      db_query_duration_p95: 0, // Would come from metrics
      failed_login_rate: 0, // Would come from metrics
    };
  }

  /**
   * Parse a metric value from Prometheus text format (simplified)
   */
  private parseMetric(
    metricsText: string,
    metricName: string,
    labelName?: string,
    labelValue?: string,
    quantile?: number
  ): number {
    // This is a simplified parser - in production use prom-client's parser
    const lines = metricsText.split('\n');
    for (const line of lines) {
      if (line.startsWith(metricName)) {
        if (labelName && !line.includes(`${labelName}="${labelValue}"`)) continue;
        if (quantile && !line.includes(`quantile="${quantile}"`)) continue;

        const match = line.match(/\s+([\d.]+)$/);
        if (match) {
          return parseFloat(match[1]);
        }
      }
    }
    return 0;
  }

  /**
   * Check a single rule against metrics
   */
  private async checkRule(rule: AlertRule, metrics: MetricSnapshot): Promise<void> {
    const currentValue = metrics[rule.metric as keyof MetricSnapshot];
    if (currentValue === undefined) {
      return;
    }

    const violatesRule = this.evaluateCondition(
      currentValue,
      rule.condition,
      rule.threshold
    );

    const now = new Date();
    const violationKey = rule.id;

    if (violatesRule) {
      // Track when violation started
      if (!this.ruleViolationStart.has(violationKey)) {
        this.ruleViolationStart.set(violationKey, now);
      }

      const violationStart = this.ruleViolationStart.get(violationKey)!;
      const violationDuration = (now.getTime() - violationStart.getTime()) / 1000;

      // Only trigger alert if duration threshold is met
      if (violationDuration >= rule.duration && !this.activeAlerts.has(violationKey)) {
        await this.triggerAlert(rule, currentValue);
      }
    } else {
      // Violation cleared
      this.ruleViolationStart.delete(violationKey);

      // Resolve active alert if exists
      if (this.activeAlerts.has(violationKey)) {
        await this.resolveAlert(violationKey);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(
    currentValue: number,
    condition: 'above' | 'below' | 'equals',
    threshold: number
  ): boolean {
    switch (condition) {
      case 'above':
        return currentValue > threshold;
      case 'below':
        return currentValue < threshold;
      case 'equals':
        return currentValue === threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule, currentValue: number): Promise<void> {
    const alert: Alert = {
      id: `${rule.id}-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
      timestamp: new Date(),
      resolved: false,
    };

    this.activeAlerts.set(rule.id, alert);
    this.alertHistory.push(alert);

    logger.warn('Alert triggered', {
      rule: rule.name,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
    });

    // Send notifications
    await this.sendNotifications(alert, rule);
  }

  /**
   * Resolve an alert
   */
  private async resolveAlert(ruleId: string): Promise<void> {
    const alert = this.activeAlerts.get(ruleId);
    if (!alert) return;

    alert.resolved = true;
    alert.resolvedAt = new Date();
    this.activeAlerts.delete(ruleId);

    logger.info('Alert resolved', {
      rule: alert.ruleName,
      metric: alert.metric,
      duration: alert.resolvedAt.getTime() - alert.timestamp.getTime(),
    });

    // Optionally send resolution notification
    // await this.sendResolutionNotifications(alert);
  }

  /**
   * Send alert notifications to all configured channels
   */
  private async sendNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    for (const channel of this.config.channels.filter((c) => c.enabled)) {
      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailNotification(alert, rule, channel);
            break;
          case 'slack':
            await this.sendSlackNotification(alert, rule, channel);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert, rule, channel);
            break;
        }
      } catch (error) {
        logger.error(`Failed to send alert via ${channel.type}`, { error, alert });
      }
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    alert: Alert,
    rule: AlertRule,
    channel: AlertChannel
  ): Promise<void> {
    const { recipients } = channel.config;

    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨',
    };

    // Send to each recipient
    for (const recipient of recipients) {
      await emailService.sendEmail({
        to: recipient,
        subject: `${severityEmoji[alert.severity]} [${alert.severity.toUpperCase()}] ${alert.ruleName}`,
        html: `
          <h2>Alert: ${alert.ruleName}</h2>
          <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
          <p><strong>Description:</strong> ${rule.description}</p>
          <p><strong>Metric:</strong> ${alert.metric}</p>
          <p><strong>Current Value:</strong> ${alert.currentValue.toFixed(2)}</p>
          <p><strong>Threshold:</strong> ${alert.threshold}</p>
          <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
          <hr>
          <p><em>This is an automated alert from NirmiteeRPM monitoring system.</em></p>
        `,
      });
    }

    logger.info('Alert email sent', { alert: alert.ruleName, recipients });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    alert: Alert,
    rule: AlertRule,
    channel: AlertChannel
  ): Promise<void> {
    const { webhookUrl, username, iconEmoji } = channel.config;

    const color = {
      info: '#36a64f',
      warning: '#ff9900',
      critical: '#ff0000',
    };

    const payload = {
      username,
      icon_emoji: iconEmoji,
      attachments: [
        {
          color: color[alert.severity],
          title: `🚨 ${alert.ruleName}`,
          text: rule.description,
          fields: [
            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
            { title: 'Metric', value: alert.metric, short: true },
            { title: 'Current Value', value: alert.currentValue.toFixed(2), short: true },
            { title: 'Threshold', value: alert.threshold.toString(), short: true },
          ],
          footer: 'NirmiteeRPM Monitoring',
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }

    logger.info('Alert Slack notification sent', { alert: alert.ruleName });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    alert: Alert,
    rule: AlertRule,
    channel: AlertChannel
  ): Promise<void> {
    const { url, method, headers } = channel.config;

    const payload = {
      alert: {
        id: alert.id,
        ruleId: alert.ruleId,
        ruleName: alert.ruleName,
        description: rule.description,
        metric: alert.metric,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
        severity: alert.severity,
        timestamp: alert.timestamp.toISOString(),
      },
    };

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    logger.info('Alert webhook sent', { alert: alert.ruleName, url });
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }
}

// Singleton instance
export const alertService = new AlertService();
