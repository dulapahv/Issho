'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { WarningIcon } from '@phosphor-icons/react';

import { CONTACT_URL, IS_DEV_ENV, NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(`${NAME} error:`, error);
  }, [error]);

  const errorDetails = `Please describe what you were doing when this error occurred:


====================
Error Details:
Status: 500
Timestamp: ${new Date().toLocaleString()} (${new Date().toISOString()})
Digest: ${error.digest || 'N/A'}
Error: ${error.name}
Message: ${error.message}
====================`;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-6">
          <WarningIcon className="text-muted-foreground/60 size-10" />

          <div className="space-y-2">
            <h1 className="text-2xl font-medium tracking-tight">
              Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm">
              An error occurred while loading this page.{' '}
              <a
                href={`${CONTACT_URL}?message=${encodeURIComponent(errorDetails)}`}
                className="underline underline-offset-2 hover:no-underline"
              >
                Contact support
              </a>{' '}
              if this keeps happening.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={reset}
            className={cn(
              'block w-full px-4 py-2.5',
              'text-sm font-medium',
              'bg-foreground text-background rounded-md',
              'hover:bg-foreground/90 transition-colors',
            )}
          >
            Try again
          </button>

          <Link
            href="/"
            className={cn(
              'block w-full px-4 py-2.5 text-center',
              'text-sm font-medium',
              'rounded-md border',
              'hover:bg-accent transition-colors',
            )}
          >
            Go home
          </Link>
        </div>

        {IS_DEV_ENV && error.message && (
          <div className="border-t pt-6">
            <details>
              <summary
                className="text-muted-foreground hover:text-foreground
                  cursor-pointer text-xs"
              >
                Debug info
              </summary>
              <pre className="text-muted-foreground mt-2 overflow-auto text-xs">
                {error.name}: {error.message}
                {error.digest && `Digest: ${error.digest}`}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
