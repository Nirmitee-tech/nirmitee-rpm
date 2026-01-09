'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layouts/sidebar';
import { Navbar } from '@/components/layouts/navbar';

// Routes that should have no padding (p-0)
const NO_PADDING_ROUTES = ['/settings', '/patient/vitals/entry', '/patients/enroll', '/call'];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const noPadding = NO_PADDING_ROUTES.some(route => pathname.startsWith(route));

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className={`flex-1 overflow-auto bg-[#F8F7FC] dark:bg-gradient-to-br dark:from-[#0a0a12] dark:via-[#0d0d1a] dark:to-[#12101f] ${noPadding ? 'p-0' : 'p-4'}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
