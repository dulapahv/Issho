"use client";

import { XCircleIcon } from "@phosphor-icons/react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

import { CONTACT_URL, IS_DEV_ENV, NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
Digest: ${error.digest || "N/A"}
Error: ${error.name}
Message: ${error.message}
====================`;

  return (
    <html
      className={cn(GeistSans.variable, GeistMono.variable, "antialiased")}
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-8">
              <div className="space-y-6">
                <XCircleIcon className="size-10 text-destructive/60" />

                <div className="space-y-2">
                  <h1 className="font-medium text-2xl tracking-tight">
                    Application error
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    The application crashed and couldn&apos;t recover.{" "}
                    <a
                      className="underline underline-offset-2 hover:no-underline"
                      href={`${CONTACT_URL}?message=${encodeURIComponent(errorDetails)}`}
                    >
                      Contact support
                    </a>{" "}
                    if this persists.
                  </p>
                </div>
              </div>

              <button
                className={cn(
                  "block w-full px-4 py-2.5",
                  "font-medium text-sm",
                  "rounded-md bg-foreground text-background",
                  "transition-colors hover:bg-foreground/90"
                )}
                onClick={reset}
              >
                Reload application
              </button>

              {IS_DEV_ENV && error.message && (
                <div className="border-t pt-6">
                  <details>
                    <summary className="cursor-pointer text-muted-foreground text-xs hover:text-foreground">
                      Debug info
                    </summary>
                    <pre className="mt-2 overflow-auto text-muted-foreground text-xs">
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
