"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Share2 } from "lucide-react";
import { HoloCard } from "@/components/onyx-ui/HoloCard";
import { Button } from "@/components/onyx-ui/Button";

interface IdentityRevealProps {
    archetype: {
        title: string;
        description: string;
        gradient: string;
        stats: Record<string, number>;
    };
    onComplete: () => void;
}

export default function IdentityReveal({ archetype, onComplete }: IdentityRevealProps) {
    const [phase, setPhase] = useState<"crystallizing" | "revealed">("crystallizing");

    useEffect(() => {
        const timer = setTimeout(() => {
            setPhase("revealed");
        }, 2500); // Crystallization time
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-xl mx-auto p-6 relative z-20">
            {/* AMBIENT GLOW */}
            <motion.div
                animate={{
                    scale: phase === "revealed" ? [1, 1.2, 1] : 1,
                    opacity: phase === "revealed" ? 0.3 : 0.1
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 blur-[100px] rounded-full pointer-events-none"
            />

            <AnimatePresence mode="wait">
                {phase === "crystallizing" ? (
                    <motion.div
                        key="crystal"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2, filter: "blur(20px)" }}
                        transition={{ duration: 1 }}
                        className="flex flex-col items-center gap-8"
                    >
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                                className="absolute inset-0 border-t-2 border-b-2 border-white/20 rounded-full"
                            />
                            <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 5, ease: "linear", repeat: Infinity }}
                                className="absolute inset-2 border-l-2 border-r-2 border-white/10 rounded-full"
                            />
                            <Sparkles className="text-white w-12 h-12 animate-pulse" />
                        </div>
                        <div className="text-white/50 tracking-[0.3em] text-sm uppercase">Crystallizing Soul ID...</div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="reveal"
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className="w-full"
                    >
                        <HoloCard className="overflow-visible !bg-white/5 !border-white/10 p-0 rounded-[3rem]">
                            {/* HEADER IMAGE / GRADIENT */}
                            <div className={`h-40 w-full bg-gradient-to-br ${archetype.gradient} relative overflow-hidden rounded-t-[3rem]`}>
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
                                <div className="absolute bottom-6 left-8">
                                    <div className="text-white/60 text-xs font-bold tracking-widest uppercase mb-1">Archetype Identified</div>
                                    <h1 className="text-4xl md:text-5xl font-thin tracking-tighter text-white">{archetype.title}</h1>
                                </div>
                            </div>

                            {/* BODY CONTENT */}
                            <div className="p-8 md:p-10 space-y-8">
                                <p className="text-white/80 leading-relaxed text-lg font-light">
                                    {archetype.description}
                                </p>

                                {/* STATS GRID */}
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(archetype.stats).map(([label, value]) => (
                                        <div key={label} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <div className="text-white/40 text-xs uppercase tracking-widest mb-2">{label}</div>
                                            <div className="flex items-end gap-2">
                                                <div className="text-2xl font-bold text-white">{value}</div>
                                                <div className="h-1.5 flex-1 bg-white/10 rounded-full mb-1.5 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${value}%` }}
                                                        transition={{ delay: 0.5, duration: 1 }}
                                                        className="h-full bg-white/40"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* ACTIONS */}
                                <div className="flex flex-col gap-4 pt-4">
                                    <Button onClick={onComplete} className="w-full py-6 text-lg bg-white text-black hover:bg-white/90 rounded-full font-medium tracking-wide">
                                        Explore Compatible Devices <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>

                                    <button className="w-full py-4 text-white/40 hover:text-white flex items-center justify-center gap-2 text-sm uppercase tracking-widest transition-colors">
                                        <Share2 size={16} /> Share Archetype
                                    </button>
                                </div>
                            </div>
                        </HoloCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
