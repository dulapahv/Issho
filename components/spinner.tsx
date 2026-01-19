import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const spinnerVariants = cva(
  "relative inline-block aspect-square transform-gpu",
  {
    variants: {
      variant: {
        default: "[&>div]:bg-foreground",
        primary: "[&>div]:bg-primary",
        secondary: "[&>div]:bg-secondary",
        destructive: "[&>div]:bg-destructive",
        muted: "[&>div]:bg-muted-foreground",
      },
      size: {
        sm: "size-4",
        default: "size-5",
        lg: "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof spinnerVariants>, "size"> {
  className?: string;
  size?: VariantProps<typeof spinnerVariants>["size"] | number;
}

// Static spinner segments configuration
const SPINNER_SEGMENTS = [
  { key: "seg-0", rotation: 0, delay: "0.000s" },
  { key: "seg-1", rotation: 30, delay: "0.083s" },
  { key: "seg-2", rotation: 60, delay: "0.166s" },
  { key: "seg-3", rotation: 90, delay: "0.249s" },
  { key: "seg-4", rotation: 120, delay: "0.332s" },
  { key: "seg-5", rotation: 150, delay: "0.415s" },
  { key: "seg-6", rotation: 180, delay: "0.498s" },
  { key: "seg-7", rotation: 210, delay: "0.581s" },
  { key: "seg-8", rotation: 240, delay: "0.664s" },
  { key: "seg-9", rotation: 270, delay: "0.747s" },
  { key: "seg-10", rotation: 300, delay: "0.830s" },
  { key: "seg-11", rotation: 330, delay: "0.913s" },
] as const;

const Spinner = ({ className, variant, size = "default" }: SpinnerProps) => (
  // biome-ignore lint/a11y/useSemanticElements: role="status" is semantically correct for loading indicators
  <div
    aria-label="Loading"
    className={cn(
      typeof size === "string"
        ? spinnerVariants({ variant, size })
        : spinnerVariants({ variant }),
      className
    )}
    role="status"
    style={typeof size === "number" ? { width: size, height: size } : undefined}
  >
    {SPINNER_SEGMENTS.map((segment) => (
      <div
        aria-hidden="true"
        className="absolute top-[4.4%] left-[46.5%] h-[24%] w-[7%] origin-[center_190%] animate-spinner rounded-full opacity-[0.1] will-change-transform"
        key={segment.key}
        style={{
          transform: `rotate(${segment.rotation}deg)`,
          animationDelay: segment.delay,
        }}
      />
    ))}
    <span className="sr-only">Loading...</span>
  </div>
);

export { Spinner, spinnerVariants };
