"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const Thinking: React.FC = () => {
    const [confidence, setConfidence] = useState(0);
    const [textIndex, setTextIndex] = useState(0);

    const texts = [
        "Analyzing 127 expert reviews...",
        "Cross-referencing with your soul...",
        "Calculating destiny vectors...",
        "Found it.",
    ];

    useEffect(() => {
        // Confidence progress
        const interval = setInterval(() => {
            setConfidence((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 1;
            });
        }, 80); // 8 seconds total roughly

        // Text rotation
        const textInterval = setInterval(() => {
            setTextIndex((prev) => (prev < texts.length - 1 ? prev + 1 : prev));
        }, 2000);

        return () => {
            clearInterval(interval);
            clearInterval(textInterval);
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center space-y-8 w-full">
            {/* Holographic Orb (CSS Replacement for R3F Crystal) */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1 }}
                className="relative w-64 h-64 flex items-center justify-center"
            >
                {/* Core */}
                <div className="absolute w-32 h-32 bg-onyx-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="absolute w-24 h-24 bg-white/30 rounded-full blur-md" />

                {/* Rings */}
                <div className="absolute w-48 h-48 border border-onyx-primary/30 rounded-full animate-[spin_4s_linear_infinite]" />
                <div className="absolute w-56 h-56 border border-accent-violet/30 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
                <div className="absolute w-64 h-64 border border-white/10 rounded-full animate-[spin_10s_linear_infinite]" />

                {/* Glint */}
                <div className="absolute top-10 right-10 w-4 h-4 bg-white rounded-full blur-[2px] animate-ping" />
            </motion.div>

            {/* Text & Confidence */}
            <div className="text-center space-y-4">
                <motion.p
                    key={textIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xl md:text-2xl font-light text-pure-light/80"
                >
                    {texts[textIndex]}
                </motion.p>

                <div className="w-64 mx-auto h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-onyx-primary to-accent-violet"
                        style={{ width: `${confidence}%` }}
                    />
                </div>
                <p className="text-sm text-pure-light/50 font-mono">{confidence}% Confidence</p>
            </div>
        </div>
    );
};

export default Thinking;
