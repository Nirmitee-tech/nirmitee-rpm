import type { Metadata, Viewport } from 'next';
import { Public_Sans, Lexend } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { OrganizationProvider } from '@/components/providers/organization-provider';
import { AuthProvider } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n/i18n-context';

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
});

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#6366f1',
};

export const metadata: Metadata = {
  title: 'NirmiteeRPM',
  description: 'Remote Patient Monitoring System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NirmiteeRPM',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${publicSans.variable} ${lexend.variable} font-sans antialiased`}>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <OrganizationProvider>
                {children}
                <Toaster position="top-right" richColors />
              </OrganizationProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
