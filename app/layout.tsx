import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PulseTube',
  description: 'Responsive YouTube music player powered by youtubei.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
