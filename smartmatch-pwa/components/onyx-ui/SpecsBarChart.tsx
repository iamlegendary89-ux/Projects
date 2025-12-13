"use client";

import { motion } from "framer-motion";
import { PhoneData } from "@/lib/phones";

interface SpecsBarChartProps {
    phone: PhoneData;
    className?: string;
}

export function SpecsBarChart({ phone, className = "" }: SpecsBarChartProps) {
    const attributes = [
        { label: "Performance", key: "Performance", fullMark: 10 },
        { label: "Camera", key: "Camera", fullMark: 10 },
        { label: "Battery", key: "Battery Endurance", fullMark: 10 },
        { label: "Display", key: "Display", fullMark: 10 },
        { label: "Design", key: "Design & Build", fullMark: 10 },
        { label: "Software", key: "Software Experience", fullMark: 10 },
        { label: "Longevity", key: "Longevity Value", fullMark: 10 },
    ];

    return (
        <div className={`space-y-3 w-full ${className}`}>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Key Attributes</h4>
            {attributes.map((attr, index) => {
                const score = phone.attributes?.[attr.key]?.score || 0;
                // Calculate percentage, maxing at 100%
                const percentage = Math.min((score / attr.fullMark) * 100, 100);

                return (
                    <div key={attr.key} className="flex items-center gap-4 text-sm">
                        <span className="w-24 text-slate-300 font-medium shrink-0">{attr.label}</span>
                        <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, delay: 0.2 + (index * 0.1), ease: "easeOut" }}
                                className="h-full bg-onyx-primary shadow-[0_0_10px_rgba(6,182,212,0.5)] rounded-full"
                            />
                        </div>
                        <span className="w-8 text-right text-onyx-primary font-bold tabular-nums">
                            {score.toFixed(1)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
