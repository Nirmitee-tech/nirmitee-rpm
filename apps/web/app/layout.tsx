import type { Metadata } from 'next';
import { Public_Sans, Lexend } from 'next/font/google';
import './globals.css';
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

export const metadata: Metadata = {
  title: 'NirmiteeRPM',
  description: 'Enterprise Risk and Performance Management',
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
              </OrganizationProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
