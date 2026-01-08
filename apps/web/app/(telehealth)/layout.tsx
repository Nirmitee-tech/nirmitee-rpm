import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Telehealth | NirmiteeRPM',
  description: 'Video consultation',
};

export default function TelehealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Full-screen layout without sidebar for video calls
  return <>{children}</>;
}
