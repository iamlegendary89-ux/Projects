"use client";

import React from "react";
import ParticleField from "@/components/onyx-ui/ParticleField";

interface StaticBackgroundProps {
    className?: string;
    primaryColor?: string;
}

export const StaticBackground: React.FC<StaticBackgroundProps> = ({
    className,
    primaryColor = "#rgba(255, 255, 255, 0.5)" // Default light particle color
}) => {
    return (
        <div className={className || "fixed inset-0 z-0 pointer-events-none"}>
            {/* 1. Static Gradient Base (Deep Slate/Black for X-Ray contrast) */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#050505] to-black" />

            {/* 2. Particle Field Overlay */}
            <div className="absolute inset-0 opacity-60">
                <ParticleField archetypeColor={primaryColor} />
            </div>

            {/* 3. Subtle Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
        </div>
    );
};

export default StaticBackground;
