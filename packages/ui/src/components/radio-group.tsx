"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from ".";

const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName ?? "RadioGroup";

const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      data-slot="radio-group-item"
      className={cn(
        "aspect-square size-5 shrink-0 rounded-full border-2 border-input text-primary shadow-xs outline-none transition-shadow",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        <span className="size-3 rounded-full bg-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName =
  RadioGroupPrimitive.Item.displayName ?? "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
