"use client";

import {
  CalendarDotsIcon,
  SignInIcon,
  SparkleIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
// biome-ignore lint/performance/noNamespaceImport: Radix UI Form uses namespace pattern
import * as Form from "@radix-ui/react-form";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { parseError } from "@/lib/utils";

export function WelcomeScreen() {
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleCreateCalendar = async () => {
    try {
      const response = await fetch("/api/calendar/create", {
        method: "POST",
      });

      if (!response.ok) {
        const errorMessage = (await response.json()).error;
        console.error(`Failed to create calendar: ${errorMessage}`);
        setServerError(`Failed to create calendar: ${errorMessage}`);
        setIsCreating(false);
        return;
      }

      const data = await response.json();

      // Store PIN in localStorage
      localStorage.setItem(`calendar-${data.id}`, data.pin);

      // Navigate to calendar
      router.push(`/calendar/${data.id}`);
    } catch (error) {
      const errorMessage = parseError(error);
      console.error(`Failed to create calendar: ${errorMessage}`);
      setServerError(`Failed to create calendar: ${errorMessage}`);
      setIsCreating(false);
    }
  };

  const handleJoinCalendar = async (id: string, pin: string) => {
    try {
      const response = await fetch("/api/calendar/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, pin }),
      });

      if (!response.ok) {
        const errorMessage = (await response.json()).error;
        console.error(`Failed to join calendar: ${errorMessage}`);
        setServerError(`Failed to join calendar: ${errorMessage}`);
        setIsJoining(false);
        return;
      }

      // Store PIN in localStorage
      localStorage.setItem(`calendar-${id}`, pin);

      // Navigate to calendar
      router.push(`/calendar/${id}`);
    } catch (error) {
      const errorMessage = parseError(error);
      console.error(`Failed to join calendar: ${errorMessage}`);
      setServerError(`Failed to join calendar: ${errorMessage}`);
      setIsJoining(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setServerError("");
    try {
      await handleCreateCalendar();
    } catch (error) {
      const errorMessage = parseError(error);
      console.error(`Failed to create calendar: ${errorMessage}`);
      setServerError(`Failed to create calendar: ${errorMessage}`);
      setIsCreating(false);
    }
  };

  const handleJoinSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));

    setIsJoining(true);
    setServerError("");

    try {
      await handleJoinCalendar(
        data["calendar-id"] as string,
        data.pin as string
      );
    } catch (error) {
      const errorMessage = parseError(error);
      console.error(`Failed to join calendar: ${errorMessage}`);
      setServerError(`Failed to join calendar: ${errorMessage}`);
      setIsJoining(false);
    }
  };

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left Side - Actions */}
      <div className="flex w-full flex-col p-8 lg:w-2/5 lg:p-12 xl:w-[45%] xl:p-16">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          {/* Logo/Brand (optional) */}
          <div className="mb-8 lg:mb-12">
            <div className="mb-6">
              <h1 className="bg-linear-to-r from-primary to-primary/60 bg-clip-text font-bold text-4xl text-transparent lg:text-5xl">
                Issho
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                Plan with friends faster — mark availability and find the best
                time together, no signup required.
              </p>
            </div>
          </div>

          {/* Create Calendar Section */}
          <div className="mb-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <CalendarDotsIcon className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Start Fresh</h2>
                <p className="text-muted-foreground text-sm">
                  Create a new shared calendar
                </p>
              </div>
            </div>
            <Button
              className="w-full"
              disabled={isCreating || isJoining}
              onClick={handleCreate}
              size="lg"
            >
              {isCreating ? (
                <Spinner size="sm" variant="secondary" />
              ) : (
                <SparkleIcon className="size-5" />
              )}
              Create New Calendar
            </Button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          {/* Join Calendar Section */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <UserPlusIcon className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Join Friends</h2>
                <p className="text-muted-foreground text-sm">
                  Enter calendar details to join
                </p>
              </div>
            </div>

            <Form.Root
              className="space-y-4"
              onClearServerErrors={() => setServerError("")}
              onSubmit={handleJoinSubmit}
            >
              {/* Calendar ID Field */}
              <Form.Field name="calendar-id">
                <div className="flex items-baseline justify-between">
                  <Form.Label className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Calendar ID
                  </Form.Label>
                  <Form.Message
                    className="text-[13px] text-destructive"
                    match="valueMissing"
                  >
                    Please enter a calendar ID
                  </Form.Message>
                </div>
                <Form.Control asChild>
                  <Input
                    className="mt-2 font-mono tracking-widest data-invalid:border-destructive"
                    disabled={isCreating || isJoining}
                    placeholder="Enter calendar ID"
                    required
                    type="text"
                  />
                </Form.Control>
              </Form.Field>

              {/* PIN Field */}
              <Form.Field name="pin">
                <div className="flex items-baseline justify-between">
                  <Form.Label className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    PIN (6 digits)
                  </Form.Label>
                  <Form.Message
                    className="text-[13px] text-destructive"
                    match="valueMissing"
                  >
                    Please enter a PIN
                  </Form.Message>
                  <Form.Message
                    className="text-[13px] text-destructive"
                    match="patternMismatch"
                  >
                    PIN must be exactly 6 digits
                  </Form.Message>
                  <Form.Message
                    className="text-[13px] text-destructive"
                    match={(value) => !!value && value.length !== 6}
                  >
                    PIN must be exactly 6 digits
                  </Form.Message>
                </div>
                <Form.Control asChild>
                  <Input
                    className="mt-2 font-mono tracking-[0.5em] data-invalid:border-destructive"
                    disabled={isCreating || isJoining}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 6) {
                        e.target.value = value;
                      }
                    }}
                    pattern="[0-9]{6}"
                    placeholder="000000"
                    required
                    type="text"
                  />
                </Form.Control>
              </Form.Field>

              {/* Submit Button */}
              <Form.Submit asChild>
                <Button
                  className="w-full"
                  disabled={isJoining || isCreating}
                  size="lg"
                  variant="outline"
                >
                  {isJoining ? (
                    <Spinner size="sm" />
                  ) : (
                    <SignInIcon className="size-5" />
                  )}
                  Join Calendar
                </Button>
              </Form.Submit>
            </Form.Root>
          </div>

          {/* Server Error Message */}
          {serverError && (
            <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <p className="text-destructive text-sm">{serverError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Image with overflow effect */}
      <div className="relative hidden lg:block lg:w-3/5 xl:w-[55%]">
        {/* Gradient overlay for smooth transition */}
        <div className="absolute inset-y-0 left-0 z-10 w-32 bg-linear-to-r from-background to-transparent" />

        {/* Image container with overflow */}
        <div className="relative h-full w-[110%] select-none">
          <Image
            alt="Calendar collaboration illustration"
            className="object-cover object-left"
            fill
            priority
            quality={100}
            sizes="(max-width: 1023px) 0vw, (max-width: 1279px) 150vw, (max-width: 1535px) 120vw, 100vw"
            src="/welcome.png"
          />

          <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/10" />
        </div>
      </div>
    </div>
  );
}
