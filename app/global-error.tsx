'use client';

import { useEffect } from 'react';

import { XCircleIcon } from '@phosphor-icons/react';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { ThemeProvider } from 'next-themes';

import { CONTACT_URL, IS_DEV_ENV, NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(`Critical ${NAME} error:`, error);
  }, [error]);

  const errorDetails = `Please describe what you were doing when this critical error occurred:


====================
Critical Error Details:
Status: 500 (Critical)
Timestamp: ${new Date().toLocaleString()} (${new Date().toISOString()})
Digest: ${error.digest || 'N/A'}
Error: ${error.name}
Message: ${error.message}
====================`;

  return (
    <html
      lang="en"
      className={cn(GeistSans.variable, GeistMono.variable, 'antialiased')}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-screen">
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-8">
              <div className="space-y-6">
                <XCircleIcon className="text-destructive/60 size-10" />

                <div className="space-y-2">
                  <h1 className="text-2xl font-medium tracking-tight">
                    Application error
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    The application crashed and couldn&apos;t recover.{' '}
                    <a
                      href={`${CONTACT_URL}?message=${encodeURIComponent(errorDetails)}`}
                      className="underline underline-offset-2
                        hover:no-underline"
                    >
                      Contact support
                    </a>{' '}
                    if this persists.
                  </p>
                </div>
              </div>

              <button
                onClick={reset}
                className={cn(
                  'block w-full px-4 py-2.5',
                  'text-sm font-medium',
                  'bg-foreground text-background rounded-md',
                  'hover:bg-foreground/90 transition-colors',
                )}
              >
                Reload application
              </button>

              {IS_DEV_ENV && error.message && (
                <div className="border-t pt-6">
                  <details>
                    <summary
                      className="text-muted-foreground hover:text-foreground
                        cursor-pointer text-xs"
                    >
                      Debug info
                    </summary>
                    <pre
                      className="text-muted-foreground mt-2 overflow-auto
                        text-xs"
                    >
                      {error.name}: {error.message}
                      {error.digest && `Digest: ${error.digest}`}
                      {error.stack &&
                        `\nStack: ${error.stack.substring(0, 200)}...`}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
