"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Landing from "@/components/onyx-ui/screens/Landing";
import DestinyReveal from "@/components/onyx-ui/screens/DestinyReveal";
import AdaptiveQuiz from "@/components/onyx-ui/AdaptiveQuiz";
import { OnyxClient } from "@/lib/onyx-client";
import { PhoneData } from "@/lib/phones";
import { StaticBackground } from "@/components/onyx-ui/StaticBackground";

// Dynamic import for IdentityReveal (replaces Thinking)
const IdentityReveal = dynamic(() => import("@/components/onyx-ui/screens/IdentityReveal"), { ssr: false });
// Keep Thinking/Loading for the brief API wait
const SimpleLoader = dynamic(() => import("@/components/onyx-ui/screens/Thinking"), { ssr: false });

type FlowState = "landing" | "quiz" | "analyzing" | "identityReveal" | "reveal";

interface OnyxOrchestratorProps {
    phones: PhoneData[];
}

export default function OnyxOrchestrator({ phones }: OnyxOrchestratorProps) {
    const [flowState, setFlowState] = useState<FlowState>("landing");
    const router = useRouter();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [startQuestionId, setStartQuestionId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result, setResult] = useState<any | null>(null); // SmartMatchResult typed loosely for now

    const handleStart = async () => {
        try {
            const res = await OnyxClient.startSession();
            setSessionId(res.sessionId);
            setStartQuestionId(res.nextQuestionId);
            setFlowState("quiz");
        } catch (e) {
            console.error("Failed to start session", e);
            // Fallback or error toast
        }
    };

    const handleQuizComplete = async (sid: string) => {
        setFlowState("analyzing");

        try {
            const res = await OnyxClient.finishSession(sid);

            // Map Worker Result to UI Result
            if (!res.recommendations || res.recommendations.length === 0) {
                console.warn("No recommendations returned.");
                return;
            }
            const topMatch = res.recommendations[0]!;
            const phoneDetails = phones.find(p => p.id === topMatch.phoneId) || phones[0];
            if (!phoneDetails) throw new Error("No phone details found");

            // Construct SmartMatchResult
            const uiResult = {
                data: phoneDetails,
                archetype: { primary: res.meta?.primaryArchetype || "The Pragmatist" },
                empathy_sentence: `This phone matches your priorities: ${topMatch.explanation.topContributing.join(", ")}.`,
                fate_divergence: topMatch.components.regret > 0.5 ? { message: topMatch.explanation.regretWarning || "High regret risk." } : undefined,
                regret_analysis: topMatch.regretData
            };

            setResult(uiResult);

            // Transition to Identity Reveal
            setFlowState("identityReveal");

        } catch (e) {
            console.error("Failed to finish session", e);
            setFlowState("landing"); // Reset on error
        }
    };

    const handleIdentityRevealComplete = () => {
        setFlowState("reveal");
    };

    const handleExplore = () => {
        router.push("/onyx/rankings");
    };

    return (
        <main className="relative min-h-screen w-full overflow-hidden bg-black text-white selection:bg-cyan-500/30">
            {/* Visual Stabilization: Static Background + Particles */}
            <StaticBackground primaryColor={flowState === "reveal" ? "#00D4FF" : "#ffffff"} />

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

                    {flowState === "quiz" && sessionId && startQuestionId && (
                        <motion.div
                            key="quiz"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="w-full max-w-2xl"
                        >
                            <AdaptiveQuiz
                                sessionId={sessionId}
                                initialQuestionId={startQuestionId}
                                onComplete={handleQuizComplete}
                            />
                        </motion.div>
                    )}

                    {flowState === "analyzing" && (
                        <motion.div
                            key="analyzing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full max-w-4xl"
                        >
                            <SimpleLoader />
                        </motion.div>
                    )}

                    {flowState === "identityReveal" && result && (
                        <motion.div
                            key="identityReveal"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full max-w-4xl"
                        >
                            <IdentityReveal
                                archetype={result.archetype}
                                onComplete={handleIdentityRevealComplete}
                            />
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
                </AnimatePresence>
            </div>
        </main>
    );
}
