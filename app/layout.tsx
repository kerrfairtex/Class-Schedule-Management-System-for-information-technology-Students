import type { Metadata, Viewport } from 'next';
import { Archivo, Atkinson_Hyperlegible } from 'next/font/google';
import './globals.css';
import { SYSTEM_IDENTITY } from '@/lib/domain/constants';
import { SITE_URL } from '@/lib/site';

// Body: Atkinson Hyperlegible, designed for legibility (small phones, bright
// daylight). Headings: Archivo, a sturdy civic grotesque.
const body = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
  display: 'swap',
});

const display = Archivo({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0B6B70',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
