import { VitalEntryForm } from '@/components/patient/vital-entry/vital-entry-form';

export const metadata = {
  title: 'Record Vitals | NirmiteeRPM',
  description: 'Record your vital signs and health measurements',
};

export default function RecordVitalsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <VitalEntryForm />
    </div>
  );
}
