"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import ParticleField from "@/components/onyx-ui/ParticleField";
import Landing from "@/components/onyx-ui/screens/Landing";
import GuidedFlow from "@/components/onyx-ui/screens/GuidedFlow";
import DestinyReveal from "@/components/onyx-ui/screens/DestinyReveal";
import Explore from "@/components/onyx-ui/screens/Explore";
import PhoneDetails from "@/components/onyx-ui/screens/PhoneDetails";
import { PhoneData } from "@/lib/phones";
import { smartMatch } from "@/lib/smartmatch-engine";
import { convertQuizTosmartMatchPreferences } from "@/lib/quiz-converter";
import { QuizAnswers } from "@/types";
import { SmartMatchResult, CanonicalData } from "@/lib/canonical-types";

// Dynamic import to prevent SSR crash with R3F
const Thinking = dynamic(() => import("@/components/onyx-ui/screens/Thinking"), { ssr: false });

type FlowState = "landing" | "guided" | "thinking" | "reveal" | "explore";

interface SmartMatchClientProps {
    phones: PhoneData[];
}

export default function SmartMatchClient({ phones }: SmartMatchClientProps) {
    const [flowState, setFlowState] = useState<FlowState>("landing");
    const [archetype, setArchetype] = useState<string | null>(null);
    const [result, setResult] = useState<SmartMatchResult | null>(null);
    const [selectedPhone, setSelectedPhone] = useState<PhoneData | null>(null);

    const handleStart = () => setFlowState("guided");

    const handleComplete = async (answers: QuizAnswers) => {
        // 1. Convert quiz answers to preferences
        const preferences = convertQuizTosmartMatchPreferences(answers);

        // 2. Run the SmartMatch engine
        const matchResults = await smartMatch(preferences, phones as unknown as CanonicalData[]);
        const topResult = matchResults[0];

        if (topResult) {
            setResult(topResult);
            setArchetype(topResult.archetype.primary);
        }

        setFlowState("thinking");
        // Simulate thinking time
        setTimeout(() => {
            setFlowState("reveal");
        }, 3000);
    };

    const handleExplore = () => setFlowState("explore");

    return (
        <main className="relative min-h-screen w-full overflow-hidden bg-void-black text-pure-light selection:bg-onyx-primary/30">
            <ParticleField archetypeColor={archetype ? "#00D4FF" : ""} />

            <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
                <AnimatePresence mode="wait">
                    {flowState === "landing" && (
                        <motion.div
                            key="landing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, filter: "blur(10px)" }}
                            transition={{ duration: 0.7 }}
                            className="w-full max-w-4xl"
                        >
                            <Landing onBegin={handleStart} />
                        </motion.div>
                    )}

                    {flowState === "guided" && (
                        <motion.div
                            key="guided"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="w-full max-w-2xl"
                        >
                            <GuidedFlow onComplete={handleComplete} />
                        </motion.div>
                    )}

                    {flowState === "thinking" && (
                        <motion.div
                            key="thinking"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1 }}
                            className="w-full max-w-4xl"
                        >
                            <Thinking />
                        </motion.div>
                    )}

                    {flowState === "reveal" && result && (
                        <motion.div
                            key="reveal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="w-full max-w-6xl"
                        >
                            <DestinyReveal
                                onExplore={handleExplore}
                                result={result}
                            />
                        </motion.div>
                    )}

                    {flowState === "explore" && (
                        <motion.div
                            key="explore"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="w-full max-w-7xl"
                        >
                            <Explore phones={phones} onSelectPhone={setSelectedPhone} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Phone Details Modal Overlay */}
                <AnimatePresence>
                    {selectedPhone && (
                        <PhoneDetails
                            phone={selectedPhone}
                            onClose={() => setSelectedPhone(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
