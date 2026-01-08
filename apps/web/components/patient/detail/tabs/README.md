# Patient Detail Tabs

This directory contains tab components for the patient detail page.

## AlertsTab Component

### Overview

The `AlertsTab` component displays patient alerts with filtering, acknowledgment, and resolution capabilities. It provides a comprehensive UI for healthcare providers to monitor and manage patient alerts.

### Features

- **Filter Bar**: Filter alerts by status (All, New, Acknowledged, Resolved) with count badges
- **Color-Coded Severity**: Visual indicators for alert severity levels
  - Critical: Red (bg-red-100 text-red-800)
  - Significant: Orange (bg-orange-100 text-orange-800)
  - Moderate: Yellow (bg-yellow-100 text-yellow-800)
  - Low: Blue (bg-blue-100 text-blue-800)
- **Status Management**:
  - NEW alerts show "Acknowledge" button
  - ACKNOWLEDGED alerts show "Resolve" button with resolution input
  - RESOLVED alerts display resolution text and resolver info
- **Responsive Design**: Compact, mobile-friendly UI
- **i18n Support**: Fully internationalized (English and Hindi)
- **Loading States**: Proper loading and processing states
- **Empty State**: User-friendly message when no alerts match filters

### Usage

```tsx
import { AlertsTab, Alert } from '@/components/patient/detail/tabs/alerts-tab';

function PatientAlertsPage({ patientId }: { patientId: string }) {
  const { data: alerts, isLoading, refetch } = usePatientAlerts(patientId);

  const handleAcknowledge = async (alertId: string) => {
    await acknowledgeAlert(alertId);
    refetch();
  };

  const handleResolve = async (alertId: string, resolution: string) => {
    await resolveAlert(alertId, resolution);
    refetch();
  };

  return (
    <AlertsTab
      patientId={patientId}
      alerts={alerts || []}
      isLoading={isLoading}
      onAcknowledge={handleAcknowledge}
      onResolve={handleResolve}
      onRefresh={refetch}
    />
  );
}
```

### Props

```typescript
interface AlertsTabProps {
  patientId: string;          // Patient identifier
  alerts: Alert[];            // Array of alert objects
  isLoading: boolean;         // Loading state
  onAcknowledge: (alertId: string) => Promise<void>;  // Acknowledge handler
  onResolve: (alertId: string, resolution: string) => Promise<void>;  // Resolve handler
  onRefresh: () => void;      // Refresh handler
}
```

### Alert Type

```typescript
interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: { id: string; name: string; };
  resolvedAt?: string;
  resolution?: string;
  resolvedBy?: { id: string; name: string; };
}
```

See `alerts-tab-example.tsx` for complete working example with mock data.
