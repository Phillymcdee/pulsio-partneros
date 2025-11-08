import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PartnerOS - Partner Intelligence Platform',
  description: 'Get actionable partner insights and ready-to-send outreach drafts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

