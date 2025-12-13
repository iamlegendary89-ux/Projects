"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost";
    isLoading?: boolean;
    size?: "sm" | "md" | "lg" | "xl";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", isLoading, size = "md", children, disabled, ...props }, ref) => {
        const baseStyles = "relative inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-onyx-primary/50 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden";

        const variants = {
            primary: "bg-onyx-primary text-void-black shadow-[0_0_16px_rgba(0,212,255,0.4)] hover:shadow-[0_0_24px_rgba(0,212,255,0.6)] hover:scale-[1.02] active:scale-[0.98]",
            secondary: "bg-white/5 border border-glass-border text-pure-light backdrop-blur-md hover:bg-white/10 hover:border-onyx-primary/30 hover:shadow-[0_0_12px_rgba(0,212,255,0.2)] active:scale-[0.98]",
            ghost: "bg-transparent text-pure-light/70 hover:text-onyx-primary hover:bg-white/5",
        };

        const sizes = {
            sm: "h-9 px-4 text-sm",
            md: "h-12 px-6 text-base",
            lg: "h-14 px-8 text-lg",
            xl: "h-16 px-10 text-xl w-full sm:w-auto min-w-[320px]", // For landing CTA
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {/* Inner glow for primary */}
                {variant === "primary" && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]" />
                )}

                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                <span className="relative z-10 flex items-center gap-2">{children}</span>
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button };
