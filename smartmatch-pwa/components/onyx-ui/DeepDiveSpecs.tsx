"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Camera, Cpu, Battery } from "lucide-react";
import { PhoneData } from "@/lib/phones";

interface DeepDiveSpecsProps {
    phone: PhoneData;
}

export function DeepDiveSpecs({ phone }: DeepDiveSpecsProps) {
    const [activeTab, setActiveTab] = useState<string | null>("performance");

    // Helper to safely get explanation text
    const getExplanation = (key: string) =>
        phone.attributes?.[key]?.explanation || "Specification details not available.";

    // Helper to get score
    const getScore = (key: string) =>
        phone.attributes?.[key]?.score || 0;

    const categories = [
        {
            id: "performance",
            label: "Performance",
            icon: Cpu,
            key: "Performance",
            score: getScore("Performance"),
            details: getExplanation("Performance")
        },
        {
            id: "camera",
            label: "Camera",
            icon: Camera,
            key: "Camera",
            score: getScore("Camera"),
            details: getExplanation("Camera")
        },
        {
            id: "battery",
            label: "Battery",
            icon: Battery,
            key: "Battery Endurance",
            score: getScore("Battery Endurance"),
            details: getExplanation("Battery Endurance")
        },
        {
            id: "display",
            label: "Display",
            icon: Smartphone,
            key: "Display",
            score: getScore("Display"),
            details: getExplanation("Display")
        },
    ];

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white px-1">Technical Deep Dive</h3>

            {/* Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
                {categories.map((cat) => {
                    const isActive = activeTab === cat.id;
                    const Icon = cat.icon;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(isActive ? null : cat.id)}
                            className={`
                                flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 border
                                ${isActive
                                    ? "bg-onyx-primary/10 border-onyx-primary text-onyx-primary"
                                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                                }
                            `}
                        >
                            <Icon size={18} />
                            <span className="font-medium whitespace-nowrap">{cat.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="relative min-h-[150px] bg-white/5 rounded-2xl p-6 border border-white/5 overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeTab ? (
                        (() => {
                            const activeCat = categories.find(c => c.id === activeTab)!;
                            return (
                                <motion.div
                                    key={activeCat.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-4"
                                >
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                            {activeCat.label} Analysis
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-onyx-primary/20 text-onyx-primary">
                                                {activeCat.score}/10
                                            </span>
                                        </h4>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                                        {activeCat.details}
                                    </p>

                                    {/* Mock Specs list - In a real app these would be parsed fields */}
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                        <div className="space-y-1">
                                            <span className="text-xs text-slate-500 uppercase">Verdict</span>
                                            <p className="text-sm text-onyx-primary font-medium">Excellent</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs text-slate-500 uppercase">Class</span>
                                            <p className="text-sm text-slate-300">Flagship Tier</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-center h-full text-slate-500 text-sm"
                        >
                            Select a category to view details
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
