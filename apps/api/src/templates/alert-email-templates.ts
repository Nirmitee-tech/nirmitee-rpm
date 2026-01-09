/**
 * Alert Email Templates
 * Phase 4: Monitoring & Alerts - Email notification templates
 */

interface AlertEmailData {
  patientName: string;
  alertTitle: string;
  alertMessage: string;
  severity: 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL';
  vitalType?: string;
  vitalValue?: string;
  vitalUnit?: string;
  recordedAt?: string;
  escalationLevel?: number;
  dashboardUrl: string;
  patientId: string;
}

interface EscalationEmailData {
  patientName: string;
  alertTitle: string;
  alertMessage: string;
  previousAssignee?: string;
  escalationLevel: number;
  reason: string;
  dashboardUrl: string;
  patientId: string;
  alertId: string;
}

interface DigestEmailData {
  recipientName: string;
  periodLabel: string;
  criticalAlerts: number;
  warningAlerts: number;
  vitalReadings: number;
  unresolvedAlerts: number;
  patientCount: number;
  startDate: string;
  endDate: string;
  dashboardUrl: string;
}

const SEVERITY_COLORS = {
  CRITICAL: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  SIGNIFICANT: { bg: '#FFFBEB', text: '#F59E0B', border: '#FDE68A' },
  INFORMATIONAL: { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
};

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
`;

const buttonStyle = `
  display: inline-block;
  background: #745EE1;
  color: #fff;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
`;

/**
 * Critical Alert Email Template
 */
export function criticalAlertTemplate(data: AlertEmailData): string {
  const colors = SEVERITY_COLORS.CRITICAL;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Critical Alert - NirmiteeRPM</title>
      </head>
      <body style="${baseStyles} max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Urgent Banner -->
        <div style="background: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">🚨</span>
            <div>
              <p style="margin: 0; font-weight: 700; color: ${colors.text}; font-size: 16px;">
                CRITICAL ALERT
              </p>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">
                Immediate attention required
              </p>
            </div>
          </div>
        </div>

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">⚠️ Critical Patient Alert</h1>
        </div>

        <!-- Content -->
        <div style="background: #fff; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin: 0 0 8px 0; color: #171717; font-size: 18px;">
            ${data.alertTitle}
          </h2>

          <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">
            ${data.alertMessage}
          </p>

          <!-- Patient Info -->
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #666;">Patient:</td>
                <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #171717; text-align: right;">
                  ${data.patientName}
                </td>
              </tr>
              ${data.vitalType ? `
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #666;">Vital Type:</td>
                <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #171717; text-align: right;">
                  ${data.vitalType}
                </td>
              </tr>
              ` : ''}
              ${data.vitalValue ? `
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #666;">Reading:</td>
                <td style="padding: 4px 0; font-size: 14px; font-weight: 700; color: ${colors.text}; text-align: right;">
                  ${data.vitalValue} ${data.vitalUnit || ''}
                </td>
              </tr>
              ` : ''}
              ${data.recordedAt ? `
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #666;">Time:</td>
                <td style="padding: 4px 0; font-size: 14px; color: #171717; text-align: right;">
                  ${data.recordedAt}
                </td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${data.escalationLevel && data.escalationLevel > 0 ? `
          <div style="background: #f3e8ff; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 13px; color: #7c3aed;">
              <strong>Escalation Level ${data.escalationLevel}</strong> - This alert has been escalated.
            </p>
          </div>
          ` : ''}

          <!-- Action Button -->
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.dashboardUrl}/patients/${data.patientId}" style="${buttonStyle} background: #DC2626;">
              View Patient Now
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">

          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            This is an automated alert from NirmiteeRPM.<br>
            Please respond promptly to ensure patient safety.
          </p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Warning Alert Email Template
 */
export function warningAlertTemplate(data: AlertEmailData): string {
  const colors = SEVERITY_COLORS.SIGNIFICANT;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alert - NirmiteeRPM</title>
      </head>
      <body style="${baseStyles} max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">⚠️ Patient Alert</h1>
        </div>

        <!-- Content -->
        <div style="background: #fff; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
          <div style="background: ${colors.bg}; border-left: 4px solid ${colors.text}; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 16px;">
            <p style="margin: 0; font-weight: 600; color: ${colors.text};">
              ${data.alertTitle}
            </p>
          </div>

          <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">
            ${data.alertMessage}
          </p>

          <!-- Patient Info -->
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #666;">Patient:</td>
                <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #171717; text-align: right;">
                  ${data.patientName}
                </td>
              </tr>
              ${data.vitalType ? `
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #666;">Vital Type:</td>
                <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #171717; text-align: right;">
                  ${data.vitalType}
                </td>
              </tr>
              ` : ''}
              ${data.vitalValue ? `
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #666;">Reading:</td>
                <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: ${colors.text}; text-align: right;">
                  ${data.vitalValue} ${data.vitalUnit || ''}
                </td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.dashboardUrl}/patients/${data.patientId}" style="${buttonStyle}">
              View Patient Details
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">

          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            This is an automated alert from NirmiteeRPM.
          </p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Escalation Notification Email Template
 */
export function escalationAlertTemplate(data: EscalationEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alert Escalated - NirmiteeRPM</title>
      </head>
      <body style="${baseStyles} max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">📈 Alert Escalated to You</h1>
        </div>

        <!-- Content -->
        <div style="background: #fff; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
          <div style="background: #f3e8ff; border-left: 4px solid #7c3aed; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 16px;">
            <p style="margin: 0; font-weight: 600; color: #7c3aed;">
              Escalation Level ${data.escalationLevel}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #666;">
              ${data.reason}
            </p>
          </div>

          <h2 style="margin: 0 0 8px 0; color: #171717; font-size: 18px;">
            ${data.alertTitle}
          </h2>

          <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">
            ${data.alertMessage}
          </p>

          <!-- Patient Info -->
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #666;">Patient:</td>
                <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #171717; text-align: right;">
                  ${data.patientName}
                </td>
              </tr>
              ${data.previousAssignee ? `
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #666;">Previously Assigned:</td>
                <td style="padding: 4px 0; font-size: 14px; color: #171717; text-align: right;">
                  ${data.previousAssignee}
                </td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.dashboardUrl}/alerts/${data.alertId}" style="${buttonStyle}">
              Review Alert
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">

          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            This alert requires your immediate attention.<br>
            Please acknowledge or resolve it as soon as possible.
          </p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Daily/Weekly Digest Email Template
 */
export function digestEmailTemplate(data: DigestEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.periodLabel} Digest - NirmiteeRPM</title>
      </head>
      <body style="${baseStyles} max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #745EE1 0%, #5a47b8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">NirmiteeRPM</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${data.periodLabel} Digest</p>
        </div>

        <!-- Content -->
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #171717;">
            Hi ${data.recipientName},
          </p>
          <p style="margin: 0 0 20px 0; color: #666;">
            Here's your ${data.periodLabel.toLowerCase()} summary for your patients:
          </p>

          <!-- Stats Grid -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 20px;">
            <tr>
              <td style="background: #fef2f2; padding: 16px; border-radius: 8px; text-align: center; width: 33%;">
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #dc2626;">${data.criticalAlerts}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Critical Alerts</p>
              </td>
              <td style="background: #fffbeb; padding: 16px; border-radius: 8px; text-align: center; width: 33%;">
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #f59e0b;">${data.warningAlerts}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Warnings</p>
              </td>
              <td style="background: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center; width: 33%;">
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #22c55e;">${data.vitalReadings}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Vital Readings</p>
              </td>
            </tr>
          </table>

          ${data.unresolvedAlerts > 0 ? `
          <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-weight: 600; color: #c2410c;">
              ⚠️ You have ${data.unresolvedAlerts} unresolved alert${data.unresolvedAlerts > 1 ? 's' : ''} requiring attention.
            </p>
          </div>
          ` : ''}

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}/dashboard" style="${buttonStyle}">
              View Dashboard
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Monitoring ${data.patientCount} patient${data.patientCount > 1 ? 's' : ''}<br>
            Period: ${data.startDate} - ${data.endDate}
          </p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Get appropriate template based on alert severity
 */
export function getAlertEmailTemplate(
  severity: 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL',
  data: AlertEmailData
): string {
  switch (severity) {
    case 'CRITICAL':
      return criticalAlertTemplate(data);
    case 'SIGNIFICANT':
      return warningAlertTemplate(data);
    case 'INFORMATIONAL':
    default:
      return warningAlertTemplate({ ...data, severity: 'INFORMATIONAL' });
  }
}
