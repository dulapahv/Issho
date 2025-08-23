'use client';

import { useEffect } from 'react';
import { WarningIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { NAME, IS_DEV_ENV, CONTACT_URL } from '@/lib/constants';

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
      <div className="max-w-sm w-full space-y-8">
        <div className="space-y-6">
          <WarningIcon className="size-10 text-muted-foreground/60" />
          
          <div className="space-y-2">
            <h1 className="text-2xl font-medium tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
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
              "block w-full py-2.5 px-4",
              "text-sm font-medium",
              "bg-foreground text-background rounded-md",
              "hover:bg-foreground/90 transition-colors"
            )}
          >
            Try again
          </button>
          
          <Link
            href="/"
            className={cn(
              "block w-full text-center py-2.5 px-4",
              "text-sm font-medium",
              "border rounded-md",
              "hover:bg-accent transition-colors"
            )}
          >
            Go home
          </Link>
        </div>

        {IS_DEV_ENV && error.message && (
          <div className="pt-6 border-t">
            <details>
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Debug info
              </summary>
              <pre className="mt-2 text-xs text-muted-foreground overflow-auto">
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