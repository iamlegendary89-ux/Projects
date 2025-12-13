"use client";

import React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Radio Pill ---
const RadioGroup = RadioGroupPrimitive.Root;

const RadioGroupItem = React.forwardRef<
    React.ElementRef<typeof RadioGroupPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & { label: string; archetypeColor?: string }
>(({ className, label, archetypeColor, ...props }, ref) => {
    return (
        <RadioGroupPrimitive.Item
            ref={ref}
            className={cn(
                "group relative flex items-center justify-center rounded-full border border-glass-border bg-white/5 px-6 py-3 text-base font-medium text-pure-light transition-all duration-200 hover:bg-white/10 hover:border-onyx-primary/50 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-onyx-primary/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-onyx-primary data-[state=checked]:text-void-black data-[state=checked]:border-onyx-primary data-[state=checked]:shadow-[0_0_16px_rgba(0,212,255,0.4)]",
                className
            )}
            aria-label={label}
            {...props}
        >
            <span className="relative z-10">{label}</span>
            {/* Optional: Add a subtle glow behind the text on hover */}
        </RadioGroupPrimitive.Item>
    );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

// --- Checkbox ---
const Checkbox = React.forwardRef<
    React.ElementRef<typeof CheckboxPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
            "peer h-6 w-6 shrink-0 rounded-md border border-glass-border bg-white/5 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-onyx-primary data-[state=checked]:text-void-black data-[state=checked]:border-onyx-primary",
            className
        )}
        {...props}
    >
        <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
            <Check className="h-4 w-4" />
        </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

// --- Slider ---
const Slider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
    <SliderPrimitive.Root
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        {...props}
    >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/10">
            <SliderPrimitive.Range className="absolute h-full bg-onyx-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-onyx-primary bg-void-black ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 hover:shadow-[0_0_10px_rgba(0,212,255,0.5)]" />
    </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { RadioGroup, RadioGroupItem, Checkbox, Slider };
