import type { Metadata, Viewport } from 'next';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import './globals.css';

export const metadata: Metadata = {
  title: 'coo - your personalized wiki',
  description: 'a chatbot that you can edit its responses in context',
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
    <html lang="en">
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
