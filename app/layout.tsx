import type { Metadata } from 'next';
import { JetBrains_Mono, Inter } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Class Schedule Management System',
  description: 'TRAC BSIT Department Scheduling MIS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" class={`${jetbrainsMono.variable} ${inter.variable} dark`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}