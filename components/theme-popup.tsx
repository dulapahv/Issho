'use client';

import { useState } from 'react';

import {
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from '@phosphor-icons/react';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function ThemePopup() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    {
      value: 'light',
      label: 'Light',
      icon: SunIcon,
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: MoonIcon,
    },
    {
      value: 'system',
      label: 'System',
      icon: MonitorIcon,
    },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          {theme === 'dark' ? (
            <MoonIcon className="size-5" />
          ) : theme === 'light' ? (
            <SunIcon className="size-5" />
          ) : (
            <MonitorIcon className="size-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="end">
        <div className="grid gap-1">
          {options.map((option) => (
            <Button
              key={option.value}
              onClick={() => {
                setTheme(option.value);
                setIsOpen(false);
              }}
              variant="ghost"
              className={cn(
                'justify-start rounded-sm',
                theme === option.value && '!bg-accent',
              )}
            >
              <option.icon className="size-5" />
              <span>{option.label}</span>
              {theme === option.value && (
                <CheckIcon className="ml-auto size-5" />
              )}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
