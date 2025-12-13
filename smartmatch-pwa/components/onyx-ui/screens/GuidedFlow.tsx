"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/onyx-ui/Card";
import { RadioGroup, RadioGroupItem } from "@/components/onyx-ui/Input";
import { ProgressBar } from "@/components/onyx-ui/ProgressBar";
import { QUESTIONS } from "@/lib/smartmatch-data";
import { QuizAnswers } from "@/types";

interface GuidedFlowProps {
    onComplete: (answers: QuizAnswers) => void;
}

const GuidedFlow: React.FC<GuidedFlowProps> = ({ onComplete }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});

    const currentQuestion = QUESTIONS[currentQuestionIndex]!;
    const progress = ((currentQuestionIndex) / QUESTIONS.length) * 100;

    const handleAnswer = (value: string) => {
        // Save answer
        const newAnswers = { ...answers, [currentQuestion.id]: value };
        setAnswers(newAnswers);

        // Delay for micro-interaction before moving next
        setTimeout(() => {
            if (currentQuestionIndex < QUESTIONS.length - 1) {
                setCurrentQuestionIndex((prev) => prev + 1);
            } else {
                // Complete flow
                onComplete(newAnswers as QuizAnswers);
            }
        }, 400); // 400ms delay
    };

    return (
        <div className="w-full space-y-8">
            {/* Progress */}
            <div className="w-full max-w-md mx-auto">
                <ProgressBar value={progress} className="h-1" aria-label="Quiz Progress" />
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    <Card variant="glass" className="w-full">
                        <h1 className="sr-only">SmartMatch Quiz</h1>
                        <h2 className="text-3xl md:text-4xl font-heading font-semibold text-center mb-12 text-pure-light">
                            {currentQuestion.text}
                        </h2>

                        <RadioGroup className="flex flex-col gap-4" onValueChange={handleAnswer}>
                            {currentQuestion.answers.map((answer, index) => (
                                <motion.div
                                    key={answer.text}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <RadioGroupItem
                                        value={answer.value}
                                        id={`${currentQuestion.id}-${index}`}
                                        label={answer.text}
                                        className="w-full"
                                    />
                                </motion.div>
                            ))}
                        </RadioGroup>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default GuidedFlow;
