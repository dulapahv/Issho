import { CheckIcon, XIcon } from "@phosphor-icons/react";
import type { StepType } from "@reactour/tour";
import { isMobile } from "react-device-detect";

export const steps: StepType[] = [
  {
    selector: "#tour-step-1",
    content() {
      return (
        <>
          Choose{" "}
          <span className="inline-flex items-baseline font-semibold">
            <CheckIcon className="mr-1 size-5 self-center" />
            Mark Available
          </span>{" "}
          to add your free times, or{" "}
          <span className="inline-flex items-baseline font-semibold">
            <XIcon className="mr-1 size-5 self-center" />
            Delete Available
          </span>{" "}
          to remove them.
        </>
      );
    },
  },
  {
    selector: ".rbc-month-row",
    content() {
      return (
        <>
          {isMobile ? "Tap, hold," : "Click"} and drag across dates to mark when
          you&apos;re free. Others will see your updates instantly!
        </>
      );
    },
  },
  {
    selector: "#tour-step-3",
    content:
      "Watch the metrics update to see when the most people are available - perfect for group planning.",
  },
  {
    selector: "#tour-step-4",
    content:
      "Share your calendar's invite link with friends so they can add their availability too.",
  },
  {
    selector: "#tour-step-5",
    content:
      "Need help? Click here anytime to replay this tour or learn about other features.",
  },
];
