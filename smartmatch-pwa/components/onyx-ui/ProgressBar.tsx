"use client";

import React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface ProgressBarProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
    variant?: "standard" | "confidence";
    label?: string;
    value: number;
}

const ProgressBar = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressBarProps>(
    ({ className, value, variant = "standard", label, ...props }, ref) => {
        return (
            <div className="w-full space-y-2">
                {label && (
                    <div className="flex justify-between text-sm font-medium text-pure-light/80">
                        <span>{label}</span>
                        <span>{Math.round(value)}%</span>
                    </div>
                )}
                <ProgressPrimitive.Root
                    ref={ref}
                    className={cn(
                        "relative h-2 w-full overflow-hidden rounded-full bg-white/10",
                        variant === "confidence" && "h-4 border border-glass-border",
                        className
                    )}
                    {...props}
                >
                    <ProgressPrimitive.Indicator
                        className={cn(
                            "h-full w-full flex-1 bg-onyx-primary transition-all duration-500 ease-out",
                            variant === "confidence" && "bg-gradient-to-r from-onyx-primary via-accent-indigo to-accent-violet shadow-[0_0_12px_rgba(0,212,255,0.5)]"
                        )}
                        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
                    />
                </ProgressPrimitive.Root>
            </div>
        );
    }
);
ProgressBar.displayName = ProgressPrimitive.Root.displayName;

export { ProgressBar };
