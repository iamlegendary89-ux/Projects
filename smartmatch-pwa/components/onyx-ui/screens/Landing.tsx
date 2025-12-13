"use client";

import React from "react";
import { Button } from "@/components/onyx-ui/Button";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { HoloCard } from "@/components/onyx-ui/HoloCard";

interface LandingProps {
    onBegin: () => void;
}

const Landing: React.FC<LandingProps> = ({ onBegin }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-xl mx-auto p-6 relative z-20">
            {/* THE PRISM (Central Artifact) */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="relative group"
            >
                {/* 1. The Glass Core */}
                <HoloCard
                    className="w-full aspect-square flex flex-col items-center justify-center text-center p-12 backdrop-blur-[40px] border-white/10 bg-white/5 rounded-[3rem] shadow-2xl shadow-indigo-500/10"
                    noPadding
                >
                    <div className="text-sm font-medium tracking-[0.4em] text-white/40 uppercase mb-8">
                        The Neural Lattice
                    </div>

                    <h1 className="text-5xl md:text-7xl font-thin tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/20 mb-6 relative z-10">
                        ONYX
                    </h1>

                    <div className="w-12 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8" />

                    <p className="text-white/60 font-light text-lg leading-relaxed max-w-xs mx-auto">
                        A purity-grade analysis of your digital resonance.
                    </p>
                </HoloCard>

                {/* 2. Floating Ambient Glows */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/20 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-500/20 blur-[80px] rounded-full pointer-events-none" />
            </motion.div>

            {/* ACTION BUTTON */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="mt-12"
            >
                <Button
                    size="xl"
                    onClick={onBegin}
                    className="group relative px-12 py-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full backdrop-blur-md transition-all duration-500 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                    <span className="flex items-center gap-4 text-white font-light tracking-[0.2em] uppercase text-sm">
                        Initialize
                        <ArrowRight size={16} className="text-white/50 group-hover:translate-x-1 transition-transform" />
                    </span>
                </Button>
            </motion.div>

            {/* FOOTER LINK */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-8"
            >
                <Link href="/onyx/rankings" className="text-xs text-white/20 hover:text-white/60 tracking-widest uppercase transition-colors flex items-center gap-2">
                    <Sparkles size={10} /> View Global Intelligence
                </Link>
            </motion.div>
        </div>
    );
};

export default Landing;

