'use client';

import { useState } from 'react';
import Link from 'next/link';

import {
  BookBookmarkIcon,
  GithubLogoIcon,
  PathIcon,
  QuestionIcon,
} from '@phosphor-icons/react';
import { useTour } from '@reactour/tour';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function HelpPopup() {
  const { setIsOpen, setCurrentStep } = useTour();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button id="tour-step-5" variant="outline" size="icon">
          <QuestionIcon className="size-5" />
          <span className="sr-only">Help</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-1" align="end">
        <div className="grid gap-1">
          <Button
            onClick={() => {
              setIsPopoverOpen(false);
              setIsOpen(true);
              setCurrentStep(0);
            }}
            variant="ghost"
            className="rounded-sm"
          >
            <PathIcon className="size-5" />
            Start tour again
          </Button>
          <Button
            onClick={() => {
              setIsPopoverOpen(false);
              window.open(
                'https://github.com/dulapahv/Issho/blob/main/README.md',
                '_blank',
              );
            }}
            variant="ghost"
            className="justify-start rounded-sm"
          >
            <BookBookmarkIcon className="size-5" />
            Documentation
          </Button>
          <Button
            onClick={() => {
              setIsPopoverOpen(false);
              window.open('https://github.com/dulapahv/Issho', '_blank');
            }}
            variant="ghost"
            className="justify-start rounded-sm"
          >
            <GithubLogoIcon className="size-5" />
            GitHub
          </Button>
          <p className="text-muted-foreground mt-1 text-center text-xs">
            With 💕 from{' '}
            <Link
              href="https://dulapahv.dev"
              className="underline"
              rel="noreferrer"
              target="_blank"
            >
              dulapahv
            </Link>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
