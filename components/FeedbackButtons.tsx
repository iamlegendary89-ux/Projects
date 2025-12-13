"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, Flag, X, Send } from "lucide-react";
import { submitUpvote, submitReport } from "@/lib/feedback-actions";

interface FeedbackButtonsProps {
    phoneId: string;
    initialUpvotes?: number;
}

const REPORT_CATEGORIES = [
    { id: "wrong_score", label: "Wrong Score" },
    { id: "wrong_spec", label: "Wrong Specification" },
    { id: "outdated_info", label: "Outdated Information" },
    { id: "missing_info", label: "Missing Information" },
    { id: "other", label: "Other" },
] as const;

type ReportCategory = typeof REPORT_CATEGORIES[number]["id"];

/**
 * FeedbackButtons component for upvoting insights and reporting inaccuracies
 */
export function FeedbackButtons({ phoneId, initialUpvotes = 0 }: FeedbackButtonsProps) {
    const [upvotes, setUpvotes] = useState(initialUpvotes);
    const [hasUpvoted, setHasUpvoted] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportCategory, setReportCategory] = useState<ReportCategory>("other");
    const [reportDescription, setReportDescription] = useState("");
    const [reportSubmitted, setReportSubmitted] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleUpvote = () => {
        if (hasUpvoted) return;

        startTransition(async () => {
            const result = await submitUpvote(phoneId);
            if (result.success) {
                setUpvotes(result.newCount || upvotes + 1);
                setHasUpvoted(true);
            }
        });
    };

    const handleReport = () => {
        if (!reportDescription.trim()) return;

        startTransition(async () => {
            const result = await submitReport(phoneId, reportCategory, reportDescription);
            if (result.success) {
                setReportSubmitted(true);
                setTimeout(() => {
                    setShowReportModal(false);
                    setReportSubmitted(false);
                    setReportDescription("");
                }, 2000);
            }
        });
    };

    return (
        <>
            {/* Feedback Buttons */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleUpvote}
                    disabled={hasUpvoted || isPending}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                        ${hasUpvoted
                            ? 'bg-green-500/20 text-green-400 cursor-default'
                            : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                        }
                    `}
                >
                    <ThumbsUp size={16} className={hasUpvoted ? 'fill-current' : ''} />
                    <span>{upvotes > 0 ? upvotes : 'Helpful'}</span>
                </button>

                <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                >
                    <Flag size={16} />
                    <span>Report</span>
                </button>
            </div>

            {/* Report Modal */}
            <AnimatePresence>
                {showReportModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setShowReportModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 w-full max-w-md"
                        >
                            {reportSubmitted ? (
                                <div className="text-center py-8">
                                    <div className="text-green-400 text-xl mb-2">✓</div>
                                    <p className="text-white">Thank you for your report!</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-white">Report Inaccuracy</h3>
                                        <button
                                            onClick={() => setShowReportModal(false)}
                                            className="text-white/50 hover:text-white"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Category Selection */}
                                    <div className="mb-4">
                                        <label className="block text-sm text-white/60 mb-2">Category</label>
                                        <div className="flex flex-wrap gap-2">
                                            {REPORT_CATEGORIES.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setReportCategory(cat.id)}
                                                    className={`
                                                        px-3 py-1.5 rounded-full text-xs font-medium transition-all
                                                        ${reportCategory === cat.id
                                                            ? 'bg-white text-black'
                                                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                                                        }
                                                    `}
                                                >
                                                    {cat.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="mb-6">
                                        <label className="block text-sm text-white/60 mb-2">Description</label>
                                        <textarea
                                            value={reportDescription}
                                            onChange={(e) => setReportDescription(e.target.value)}
                                            placeholder="Please describe the inaccuracy..."
                                            className="w-full h-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/30"
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        onClick={handleReport}
                                        disabled={isPending || !reportDescription.trim()}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send size={16} />
                                        <span>{isPending ? 'Submitting...' : 'Submit Report'}</span>
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default FeedbackButtons;
