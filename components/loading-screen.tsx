"use client";

import {
  ArrowCounterClockwiseIcon,
  ArrowsLeftRightIcon,
  CalendarBlankIcon,
  CalendarDotsIcon,
  CheckCircleIcon,
  HardDrivesIcon,
  HouseIcon,
  KeyIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface LoadingStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: "pending" | "loading" | "complete";
}

interface LoadingScreenProps {
  currentStep?: string;
  error?: string;
  onRetry?: () => void;
}

export function LoadingScreen({
  currentStep = "connecting",
  error,
  onRetry,
}: LoadingScreenProps) {
  const router = useRouter();

  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<LoadingStep[]>([
    {
      id: "connecting",
      label: "Connecting to calendar service",
      icon: <HardDrivesIcon className="size-5" />,
      status: "loading",
    },
    {
      id: "verifying",
      label: "Verifying credentials",
      icon: <KeyIcon className="size-5" />,
      status: "pending",
    },
    {
      id: "loading",
      label: "Loading events",
      icon: <CalendarDotsIcon className="size-5" />,
      status: "pending",
    },
    {
      id: "syncing",
      label: "Setting up real-time sync",
      icon: <ArrowsLeftRightIcon className="size-5" />,
      status: "pending",
    },
  ]);

  useEffect(() => {
    const stepIndex = steps.findIndex((s) => s.id === currentStep);
    const newProgress = Math.min(((stepIndex + 1) / steps.length) * 100, 100);

    setProgress(newProgress);

    // Update step statuses
    setSteps((prevSteps) =>
      prevSteps.map((step, index) => ({
        ...step,
        status:
          index < stepIndex
            ? "complete"
            : // biome-ignore lint/style/noNestedTernary: Step status logic is clearer as ternary
              index === stepIndex
              ? "loading"
              : "pending",
      }))
    );
  }, [currentStep, steps.findIndex, steps.length]);

  const getStepIcon = (step: LoadingStep) => {
    if (step.status === "complete") {
      return (
        <div className="flex size-5 items-center justify-center">
          <CheckCircleIcon className="size-5 text-green-500" />
        </div>
      );
    }
    if (error && step.status === "loading") {
      return (
        <div className="flex size-5 items-center justify-center">
          <XCircleIcon className="size-5 text-destructive" />
        </div>
      );
    }
    if (step.status === "loading") {
      return (
        <div className="flex size-5 items-center justify-center">
          <Spinner size="sm" variant="primary" />
        </div>
      );
    }
    return (
      <div className="flex size-5 items-center justify-center opacity-40">
        {step.icon}
      </div>
    );
  };

  const getStepTextClass = (status: string) => {
    switch (status) {
      case "complete":
        return "text-green-600 dark:text-green-400";
      case "loading":
        return "text-foreground font-medium";
      case "pending":
        return "text-muted-foreground";
      default:
        return "";
    }
  };

  return (
    <div className="absolute inset-0 flex animate-fade-in items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent>
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2 text-center">
              <div className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10">
                <CalendarBlankIcon className="size-6 text-primary" />
              </div>
              <h2 className="font-semibold text-xl">Loading Calendar</h2>
              <p className="text-muted-foreground text-sm">
                Please wait while we set everything up
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress
                aria-label="Loading progress"
                className="h-2"
                value={progress}
              />
              <p className="text-center text-muted-foreground text-xs">
                {Math.round(progress)}% complete
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {steps.map((step) => (
                <div
                  className="flex items-center gap-3 transition-all duration-300"
                  key={step.id}
                >
                  {getStepIcon(step)}
                  <span
                    className={cn("text-sm", getStepTextClass(step.status))}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="space-y-3">
                <div className="rounded-lg bg-destructive/10 p-3">
                  <p className="text-center text-destructive text-sm">
                    {error}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => router.push("/")}
                    variant="secondary"
                  >
                    <HouseIcon className="size-5" />
                    Go to Home
                  </Button>
                  {onRetry && (
                    <Button
                      className="flex-1"
                      onClick={onRetry}
                      variant="default"
                    >
                      <ArrowCounterClockwiseIcon className="size-5" />
                      Start Over
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
