import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `404 - Page Not Found | ${NAME}`,
  description: "The page you are looking for could not be found.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-6">
          <CalendarBlankIcon className="size-10 text-muted-foreground/60" />

          <div className="space-y-2">
            <h1 className="font-medium text-2xl tracking-tight">404</h1>
            <p className="text-muted-foreground text-sm">
              This page doesn&apos;t exist
            </p>
          </div>
        </div>

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
    </div>
  );
}
