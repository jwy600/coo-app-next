import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
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
      <head>
        {/* VibeLoft Web Telemetry — single global tag, loaded once per page via
            the root layout. Client-side web auth key only (not a server secret);
            browser loads https://vibeloft.ai/telemetry/v1.js and posts events to
            https://api.vibeloft.ai. See docs/architecture.md. */}
        <script
          defer
          src="https://vibeloft.ai/telemetry/v1.js"
          data-vl-product-id="8519bf37-ca4d-4e30-a632-a4e442019edc"
          data-vl-auth-key="vl_web.CEB-SD63N_Oj1IP56K-7shda9r0Mr0sCiY5K9VCaRzA"
        />
      </head>
      <body>
        <Toaster position="bottom-right" />
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
