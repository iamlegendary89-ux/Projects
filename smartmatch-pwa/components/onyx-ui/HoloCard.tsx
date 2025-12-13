"use client";

import React from "react";
import { motion, useMotionTemplate, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface HoloCardProps {
    children: React.ReactNode;
    className?: string;
    intensity?: "subtle" | "medium" | "high";
    isActive?: boolean;
    noPadding?: boolean;
    onClick?: () => void;
}

export const HoloCard = ({
    children,
    className,
    intensity: _intensity = "medium",
    isActive = false,
    noPadding = false,
    onClick
}: HoloCardProps) => {
    const mouseX = useSpring(0, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(0, { stiffness: 500, damping: 100 });

    function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
        const { left, top } = event.currentTarget.getBoundingClientRect();
        mouseX.set(event.clientX - left);
        mouseY.set(event.clientY - top);
    }

    const maskImage = useMotionTemplate`radial-gradient(400px at ${mouseX}px ${mouseY}px, white, transparent)`;
    const style = { maskImage, WebkitMaskImage: maskImage };

    return (
        <div
            onClick={onClick}
            onMouseMove={onMouseMove}
            className={cn(
                "group relative overflow-hidden rounded-[2rem] border border-white/5 bg-white/5 backdrop-blur-3xl transition-all duration-500",
                "hover:bg-white/10 hover:border-white/10",
                isActive && "border-white/20 bg-white/10 shadow-[0_0_50px_rgba(255,255,255,0.05)]",
                className
            )}
        >
            {/* 1. X-Ray Gradient Overlay (Moving Highlight) */}
            <div className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 group-hover:opacity-100 opacity-50">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={style}
                />
            </div>

            {/* 2. Shine Effect (Top Edge) */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

            {/* 3. Shine Effect (Bottom Edge) */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30" />

            {/* 4. Content */}
            <div className={cn("relative z-10", !noPadding && "p-6 md:p-8")}>
                {children}
            </div>
        </div>
    );
};

HoloCard.displayName = "HoloCard";

