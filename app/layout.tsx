import type { Metadata, Viewport } from 'next';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import './globals.css';
import { Inter } from "next/font/google";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Coo - Blockwise AI Chat',
  description: 'Edit AI answers in place with block-level granularity',
  keywords: ['AI', 'chat', 'blocks', 'editing', 'OpenAI', 'GPT'],
  authors: [{ name: 'Coo Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
