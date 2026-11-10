import type { Metadata } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SYSTEM_IDENTITY } from '@/lib/domain/constants';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

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
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} dark`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
