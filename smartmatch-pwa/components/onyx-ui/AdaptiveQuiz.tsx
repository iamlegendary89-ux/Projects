"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HoloCard } from "@/components/onyx-ui/HoloCard";
import { OnyxClient } from "@/lib/onyx-client";
import { ONYX_QUESTIONS } from "@/lib/onyx-questions";
import { toast } from "sonner";
import { Sparkles, ArrowRight } from "lucide-react";

interface AdaptiveQuizProps {
    sessionId: string;
    initialQuestionId: string;
    onComplete: (sessionId: string) => void;
}

export default function AdaptiveQuiz({ sessionId, initialQuestionId, onComplete }: AdaptiveQuizProps) {
    const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(initialQuestionId);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [progress, setProgress] = useState(0);

    const question = currentQuestionId ? ONYX_QUESTIONS[currentQuestionId] : null;

    useEffect(() => {
        // Smooth progress interpolation
        setProgress(prev => Math.min(prev + 15, 95));
        if (currentQuestionId === null) setProgress(100);
    }, [currentQuestionId]);

    const handleAnswer = async (optionId: string) => {
        if (!currentQuestionId || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const response = await OnyxClient.submitAnswer(sessionId, currentQuestionId, optionId);
            if (response.nextQuestionId) {
                if (ONYX_QUESTIONS[response.nextQuestionId]) {
                    setCurrentQuestionId(response.nextQuestionId);
                } else {
                    onComplete(sessionId);
                }
            } else {
                onComplete(sessionId);
            }
        } catch (error) {
            console.error(error);
            toast.error("Err. Connection Unstable.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!question) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto mb-6" />
                    <div className="text-white/40 tracking-widest text-sm uppercase">Crystallizing Path...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full max-w-2xl mx-auto flex flex-col items-center justify-center p-6 relative">
            {/* Ambient Back Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

            <AnimatePresence mode="wait">
                <motion.div
                    key={question.id}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                    transition={{ duration: 0.5, ease: "circOut" }}
                    className="w-full"
                >
                    <HoloCard className="w-full flex flex-col p-8 md:p-12 backdrop-blur-[50px] bg-white/5 border-white/10 rounded-[3rem]">
                        {/* Progress Pill */}
                        <div className="flex justify-center mb-8">
                            <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                                <Sparkles size={12} className="text-white/40" />
                                <span className="text-xs font-medium text-white/40 tracking-widest uppercase">
                                    Resonance: {Math.round(progress)}%
                                </span>
                            </div>
                        </div>

                        {/* Question */}
                        <h2 className="text-2xl md:text-4xl font-light text-center text-white mb-12 leading-tight">
                            {question.text}
                        </h2>

                        {/* Options */}
                        <div className="grid grid-cols-1 gap-4">
                            {question.options.map((opt, idx) => (
                                <motion.button
                                    key={opt.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 + 0.2 }}
                                    onClick={() => handleAnswer(opt.id)}
                                    className="group relative flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isSubmitting}
                                >
                                    <span className="text-lg font-light text-white/80 group-hover:text-white transition-colors text-left">
                                        {opt.text}
                                    </span>

                                    {/* Arrow icon that appears on hover */}
                                    <div className="w-8 h-8 rounded-full bg-white/0 group-hover:bg-white/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">
                                        <ArrowRight size={16} className="text-white" />
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </HoloCard>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

