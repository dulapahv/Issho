"use client";

import { WarningIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";

import { CONTACT_URL, IS_DEV_ENV, NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: globalThis.Error & { digest?: string };
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
Digest: ${error.digest || "N/A"}
Error: ${error.name}
Message: ${error.message}
====================`;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-6">
          <WarningIcon className="size-10 text-muted-foreground/60" />

          <div className="space-y-2">
            <h1 className="font-medium text-2xl tracking-tight">
              Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm">
              An error occurred while loading this page.{" "}
              <a
                className="underline underline-offset-2 hover:no-underline"
                href={`${CONTACT_URL}?message=${encodeURIComponent(errorDetails)}`}
              >
                Contact support
              </a>{" "}
              if this keeps happening.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            className={cn(
              "block w-full px-4 py-2.5",
              "font-medium text-sm",
              "rounded-md bg-foreground text-background",
              "transition-colors hover:bg-foreground/90"
            )}
            onClick={reset}
            type="button"
          >
            Try again
          </button>

          <Link
            className={cn(
              "block w-full px-4 py-2.5 text-center",
              "font-medium text-sm",
              "rounded-md border",
              "transition-colors hover:bg-accent"
            )}
            href="/"
          >
            Go home
          </Link>
        </div>

        {IS_DEV_ENV && error.message && (
          <div className="border-t pt-6">
            <details>
              <summary className="cursor-pointer text-muted-foreground text-xs hover:text-foreground">
                Debug info
              </summary>
              <pre className="mt-2 overflow-auto text-muted-foreground text-xs">
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
