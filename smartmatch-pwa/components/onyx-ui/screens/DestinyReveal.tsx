"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { Button } from "@/components/onyx-ui/Button";
import { Card } from "@/components/onyx-ui/Card";
import { ProgressBar } from "@/components/onyx-ui/ProgressBar";
import { SmartMatchResult } from "@/lib/canonical-types";

interface DestinyRevealProps {
    onExplore: () => void;
    result: SmartMatchResult | null;
}

// Animation Variants (Cinematic)
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.8, // Slow dramatic pacing
            delayChildren: 0.5,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    show: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } // ease-out-expo
    },
};

const phoneVariants: Variants = {
    hidden: { opacity: 0, y: 100, scale: 0.9 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 2, ease: "circOut" },
    },
};

const DestinyReveal: React.FC<DestinyRevealProps> = ({ onExplore, result }) => {
    if (!result) return <div className="text-center text-white">No match found.</div>;

    const { data: phone, archetype, empathy_sentence, fate_divergence } = result;

    return (
        <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full p-4 md:p-12"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            {/* Left: Phone Render (The Hero) */}
            <div className="relative flex justify-center order-2 lg:order-1">
                <motion.div variants={phoneVariants} className="relative w-[300px] h-[600px] md:w-[360px] md:h-[720px]">
                    {/* Glowing Aura (God Rays) */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-onyx-primary/30 to-accent-violet/30 blur-[100px] rounded-full animate-pulse opacity-60" />

                    <Card variant="phone" className="w-full h-full border-2 border-onyx-primary/50 shadow-[0_0_50px_rgba(0,212,255,0.4)]" hoverEffect={false}>
                        <div className="absolute inset-2 rounded-[2rem] overflow-hidden bg-void-black">
                            {/* Phone Image */}
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black">
                                {phone.image && (
                                    <img
                                        src={phone.image}
                                        alt={`${phone.brand} ${phone.model}`}
                                        className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-1000"
                                    />
                                )}
                            </div>
                            <div className="absolute bottom-0 inset-x-0 h-2/3 bg-gradient-to-t from-black via-black/50 to-transparent" />
                            <div className="absolute bottom-10 left-0 right-0 text-center px-4">
                                <h3 className="text-4xl font-heading font-bold text-white tracking-tight">{phone.brand}</h3>
                                <p className="text-xl text-white/80 font-light">{phone.model}</p>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* Right: Details (The Story) */}
            <div className="space-y-10 order-1 lg:order-2">
                <motion.div variants={itemVariants}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-onyx-primary/30 bg-onyx-primary/10 text-onyx-primary mb-6 shadow-[0_0_20px_rgba(0,212,255,0.15)]">
                        <span className="w-2 h-2 rounded-full bg-onyx-primary animate-pulse shadow-[0_0_8px_#00D4FF]" />
                        <span className="text-sm font-medium tracking-wide uppercase">{archetype.primary}</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-heading font-bold leading-[0.9] text-transparent bg-clip-text bg-gradient-to-r from-white via-pure-light to-white/50 mb-8">
                        The One.
                    </h1>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <p className="text-2xl md:text-4xl font-light italic text-pure-light/90 border-l-4 border-onyx-primary pl-8 py-2">
                        "{empathy_sentence}"
                    </p>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-6 bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <ProgressBar value={Math.round(phone.overallScore * 10)} label="Soul Match Compatibility" variant="confidence" />

                    {/* Regret Analysis: The Brutal Truth */}
                    {result.regret_analysis && result.regret_analysis.totalRegretScore > 4 && (
                        <div className="mt-4 p-4 border border-red-500/30 bg-red-950/20 rounded-xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
                            <div className="relative z-10">
                                <h4 className="text-red-400 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    Brutal Truth / Warning
                                </h4>
                                {Object.entries(result.regret_analysis.attributes)
                                    .filter(([_, data]) => data.regretScore > 5)
                                    .sort((a, b) => b[1].regretScore - a[1].regretScore)
                                    .slice(0, 1) // Only show the #1 dealbreaker
                                    .map(([attr, data]) => (
                                        <div key={attr}>
                                            <p className="text-white/90 font-medium">
                                                Users confirm: <span className="text-red-300">"{data.topComplaints[0]}"</span>
                                            </p>
                                            <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
                                                <span>Penalty Level:</span>
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <div key={i} className={`h-1 w-4 rounded-full ${i < data.regretScore / 2 ? 'bg-red-500' : 'bg-white/10'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {fate_divergence && !result.regret_analysis && (
                        <p className="text-sm text-pure-light/60 font-mono">
                            <span className="text-accent-violet">Anomaly Detected:</span> {fate_divergence.message}
                        </p>
                    )}
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6 pt-4">
                    <Button size="xl" className="w-full sm:w-auto shadow-none hover:shadow-[0_0_30px_rgba(0,212,255,0.6)]">
                        Claim Destiny
                    </Button>
                    <Button variant="ghost" size="lg" onClick={onExplore} className="w-full sm:w-auto text-pure-light/50 hover:text-white">
                        View Alternatives &rarr;
                    </Button>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default DestinyReveal;
