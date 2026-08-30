import type { Metadata } from 'next';
import './globals.css';
import { SYSTEM_IDENTITY } from '@/lib/domain/constants';

export const metadata: Metadata = {
  title: `${SYSTEM_IDENTITY.product} — ${SYSTEM_IDENTITY.short}`,
  description: `Academic scheduling and timetable management platform for ${SYSTEM_IDENTITY.program} of ${SYSTEM_IDENTITY.institution}.`,
  applicationName: SYSTEM_IDENTITY.product,
  authors: [{ name: 'TRAC BSIT CSMS Developer Team' }],
  keywords: ['TRAC', 'BSIT', 'Class Schedule', 'Tawi-Tawi', 'Bongao'],
  openGraph: {
    title: `${SYSTEM_IDENTITY.product} — ${SYSTEM_IDENTITY.short}`,
    description: `Academic scheduling platform for ${SYSTEM_IDENTITY.program}, ${SYSTEM_IDENTITY.institution}.`,
    type: 'website',
    siteName: SYSTEM_IDENTITY.short,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">{children}</body>
    </html>
  );
}