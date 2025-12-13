"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Settings, SunMoon, Zap, Eye, X } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useHighContrast } from "@/hooks/use-high-contrast";

/**
 * AccessibilitySettings component - floating a11y settings panel
 */
export function AccessibilitySettings() {
    const [isOpen, setIsOpen] = useState(false);
    const { shouldReduceMotion, toggleReducedMotion } = useReducedMotion();
    const { shouldUseHighContrast, toggleHighContrast } = useHighContrast();

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/70 hover:text-white hover:bg-white/20 transition-all shadow-lg"
                aria-label="Accessibility Settings"
            >
                <Settings size={20} />
            </button>

            {/* Settings Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 w-full max-w-sm shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <Eye size={20} className="text-white/60" />
                                    <h3 className="text-lg font-semibold text-white">Accessibility</h3>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-white/50 hover:text-white"
                                    aria-label="Close settings"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Reduced Motion Toggle */}
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Zap size={18} className="text-yellow-400" />
                                        <div>
                                            <div className="text-white font-medium">Reduce Motion</div>
                                            <div className="text-xs text-white/50">Minimize animations</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleReducedMotion}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${shouldReduceMotion ? "bg-blue-500" : "bg-white/20"
                                            }`}
                                        role="switch"
                                        aria-checked={shouldReduceMotion}
                                        aria-label="Toggle reduced motion"
                                    >
                                        <span
                                            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${shouldReduceMotion ? "translate-x-6" : ""
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* High Contrast Toggle */}
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <SunMoon size={18} className="text-purple-400" />
                                        <div>
                                            <div className="text-white font-medium">High Contrast</div>
                                            <div className="text-xs text-white/50">Increase color contrast</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleHighContrast}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${shouldUseHighContrast ? "bg-purple-500" : "bg-white/20"
                                            }`}
                                        role="switch"
                                        aria-checked={shouldUseHighContrast}
                                        aria-label="Toggle high contrast mode"
                                    >
                                        <span
                                            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${shouldUseHighContrast ? "translate-x-6" : ""
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <p className="mt-6 text-xs text-white/40 text-center">
                                Settings are saved locally
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default AccessibilitySettings;
