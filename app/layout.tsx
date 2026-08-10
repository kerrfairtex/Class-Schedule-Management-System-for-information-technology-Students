import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Class Schedule Management System',
  description: 'TRAC BSIT Department Scheduling MIS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
