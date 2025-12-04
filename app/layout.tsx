import { ViewTransition } from 'react';
import type { Metadata, Viewport } from 'next';

import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

import {
  AUTHOR_BASE_URL,
  AUTHOR_NAME,
  AUTHOR_TWITTER_HANDLE,
  BASE_URL,
  DESCRIPTION,
  NAME,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Analytics } from '@/components/analytics';

import './globals.css';

export const metadata: Metadata = {
  title: `${NAME} - Plan with friends, faster`,
  description: DESCRIPTION,
  applicationName: NAME,
  metadataBase: new URL(BASE_URL),
  keywords: [
    'calendar',
    'planning',
    'productivity',
    'collaboration',
    'meeting',
    'overlap',
  ],
  authors: {
    name: AUTHOR_NAME,
    url: AUTHOR_BASE_URL,
  },
  creator: AUTHOR_NAME,
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: NAME,
  },
  openGraph: {
    title: NAME,
    description: DESCRIPTION,
    type: 'website',
    siteName: NAME,
    locale: 'en_US',
    url: BASE_URL,
  },
  publisher: AUTHOR_NAME,
  twitter: {
    title: NAME,
    description: DESCRIPTION,
    creatorId: AUTHOR_TWITTER_HANDLE,
    card: 'summary_large_image',
    creator: AUTHOR_TWITTER_HANDLE,
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export const viewport: Viewport = {
  // themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        'text-pretty antialiased',
      )}
      suppressHydrationWarning
    >
      <head>
        <meta name="darkreader-lock" />
      </head>
      <body className="bg-background text-foreground min-h-screen">
        <Analytics />
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <ViewTransition>{children}</ViewTransition>
          <Toaster className="whitespace-pre-line" theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
