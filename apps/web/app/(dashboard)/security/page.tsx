import { Shield, AlertTriangle, CheckCircle, Lock, Eye, Clock } from 'lucide-react';
import { Button, Badge } from '@nirmitee/ui';

const securityEvents = [
  {
    id: '1',
    type: 'login',
    message: 'Successful login from new device',
    ip: '192.168.1.1',
    time: '2 min ago',
    severity: 'info',
  },
  {
    id: '2',
    type: 'password',
    message: 'Password changed successfully',
    ip: '192.168.1.1',
    time: '1 hour ago',
    severity: 'success',
  },
  {
    id: '3',
    type: 'failed_login',
    message: 'Failed login attempt',
    ip: '45.33.32.156',
    time: '2 hours ago',
    severity: 'warning',
  },
  {
    id: '4',
    type: 'permission',
    message: 'Admin permissions granted to user',
    ip: '192.168.1.1',
    time: '5 hours ago',
    severity: 'info',
  },
  {
    id: '5',
    type: 'blocked',
    message: 'Suspicious activity blocked',
    ip: '185.220.101.42',
    time: '1 day ago',
    severity: 'danger',
  },
];

const severityColors = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
} as const;

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-primary">Security</h1>
          <p className="text-secondary mt-1">Monitor and manage security settings</p>
        </div>
        <Button variant="outline">
          <Shield className="h-4 w-4 mr-2" />
          Security Settings
        </Button>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="background-white border-primary p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="text-sm text-secondary">Security Score</div>
              <div className="text-xl font-semibold text-primary">92/100</div>
            </div>
          </div>
          <Badge variant="success">Excellent</Badge>
        </div>

        <div className="background-white border-primary p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <div className="text-sm text-secondary">Active Alerts</div>
              <div className="text-xl font-semibold text-primary">3</div>
            </div>
          </div>
          <Badge variant="warning">Needs Attention</Badge>
        </div>

        <div className="background-white border-primary p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-brand" />
            </div>
            <div>
              <div className="text-sm text-secondary">2FA Enabled</div>
              <div className="text-xl font-semibold text-primary">78%</div>
            </div>
          </div>
          <Badge variant="default">Users</Badge>
        </div>
      </div>

      {/* Security Events */}
      <div className="background-white border-primary rounded-lg">
        <div className="p-4 border-b border-[#D7D7D7] dark:border-[#212121]">
          <h2 className="text-h3 text-primary">Recent Security Events</h2>
        </div>
        <div className="divide-y divide-[#D7D7D7] dark:divide-[#212121]">
          {securityEvents.map((event) => (
            <div key={event.id} className="p-4 flex items-start gap-4">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                event.severity === 'danger' ? 'bg-danger/10' :
                event.severity === 'warning' ? 'bg-warning/10' :
                event.severity === 'success' ? 'bg-success/10' : 'bg-brand/10'
              }`}>
                {event.severity === 'danger' ? (
                  <AlertTriangle className="h-4 w-4 text-danger" />
                ) : event.severity === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-warning" />
                ) : event.severity === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <Eye className="h-4 w-4 text-brand" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-primary">{event.message}</span>
                  <Badge variant={severityColors[event.severity]} className="text-xs capitalize">
                    {event.severity}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-secondary">
                  <span>IP: {event.ip}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {event.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
