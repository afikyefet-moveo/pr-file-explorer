import * as React from "react";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onValueChange: (next: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
  disabled,
}: SegmentedProps<T>): React.ReactElement {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex w-full rounded-md border border-input bg-background p-0.5",
        disabled && "opacity-50",
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            type="button"
            key={option.value}
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "flex-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
