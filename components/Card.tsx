"use client";

import React from "react";

import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue, useSpring, HTMLMotionProps } from "framer-motion";

interface CardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
    variant?: "glass" | "phone" | "archetype";
    hoverEffect?: boolean;
    children?: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = "glass", hoverEffect = true, children, ...props }, ref) => {
        const mouseX = useMotionValue(0);
        const mouseY = useMotionValue(0);

        // Physics: Stiff spring for premium weight
        const springConfig = { damping: 20, stiffness: 200 };
        const rotateX = useSpring(useMotionValue(0), springConfig);
        const rotateY = useSpring(useMotionValue(0), springConfig);

        function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
            if (!hoverEffect) return;
            const { left, top, width, height } = currentTarget.getBoundingClientRect();
            const centerX = left + width / 2;
            const centerY = top + height / 2;

            mouseX.set(clientX - left);
            mouseY.set(clientY - top);

            // Subtle tilt: Max 5 degrees
            rotateX.set(((clientY - centerY) / height) * -5);
            rotateY.set(((clientX - centerX) / width) * 5);
        }

        function handleMouseLeave() {
            if (!hoverEffect) return;
            mouseX.set(0);
            mouseY.set(0);
            rotateX.set(0);
            rotateY.set(0);
        }

        const baseStyles = "relative overflow-hidden rounded-2xl border border-glass-border bg-white/5 backdrop-blur-xl transition-[background-color,border-color] duration-300";

        const variants = {
            glass: "p-8",
            phone: "p-0 aspect-[9/19] bg-black/40 border-white/10",
            archetype: "p-6 bg-gradient-to-br from-white/5 to-transparent hover:from-white/10",
        };

        const maskImage = useMotionTemplate`radial-gradient(240px circle at ${mouseX}px ${mouseY}px, white, transparent)`;
        const style = hoverEffect ? { rotateX, rotateY, transformStyle: "preserve-3d" } : {};

        return (
            <motion.div
                ref={ref as any}
                className={cn(baseStyles, variants[variant], className)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={style as any}
                role="article"
                aria-label={props["aria-label"] || "Content Card"}
                {...(props as any)}
            >
                {/* 1. Spotlight Overlay (Holographic Shine) */}
                {hoverEffect && (
                    <motion.div
                        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-onyx-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        style={{ maskImage, WebkitMaskImage: maskImage }}
                    />
                )}

                {/* 2. Noise texture */}
                <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

                {/* 3. Border Glow */}
                {hoverEffect && (
                    <motion.div
                        className="pointer-events-none absolute inset-0 z-10 border border-onyx-primary/20 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />
                )}

                {/* 4. Content Content */}
                <div className="relative z-20 h-full transform-style-3d">
                    {children}
                </div>
            </motion.div>
        );
    }
);
Card.displayName = "Card";

export { Card };
