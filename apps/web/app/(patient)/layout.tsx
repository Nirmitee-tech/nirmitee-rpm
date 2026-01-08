'use client';

import { PatientBottomNav } from '@/components/patient/patient-bottom-nav';
import { PatientHeader } from '@/components/patient/patient-header';
import { OfflineIndicator } from '@/components/patient/offline-indicator';

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      <OfflineIndicator />
      <PatientHeader />
      <main className="flex-1 overflow-auto pb-16">
        <div className="mx-auto max-w-screen-xl">{children}</div>
      </main>
      <PatientBottomNav />
    </div>
  );
}
