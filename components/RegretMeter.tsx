"use client";

import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, CheckCircle } from "lucide-react";

// Define regret data types inline for now (could be moved to types file)
interface AttributeRegret {
    regretScore: number;
    frequency: "very_high" | "high" | "medium" | "low";
    topComplaints: string[];
}

interface PhoneRegretData {
    phoneId: string;
    totalRegretScore: number;
    attributes: Record<string, AttributeRegret>;
}

interface RegretMeterProps {
    phoneId: string;
    regretData?: PhoneRegretData;
}

const FREQUENCY_LABELS = {
    very_high: "Very Common",
    high: "Common",
    medium: "Occasional",
    low: "Rare",
};

const FREQUENCY_COLORS = {
    very_high: "text-red-400",
    high: "text-orange-400",
    medium: "text-yellow-400",
    low: "text-green-400",
};

/**
 * RegretMeter component - visualizes common user regrets for a phone
 */
export function RegretMeter({ regretData }: RegretMeterProps) {
    if (!regretData) {
        return null; // No regret data available
    }

    const { totalRegretScore, attributes } = regretData;

    // Get regret level based on total score
    const getRegretLevel = (score: number) => {
        if (score <= 3) return { label: "Low Regret", color: "text-green-400", icon: CheckCircle };
        if (score <= 6) return { label: "Moderate Regret", color: "text-yellow-400", icon: TrendingDown };
        return { label: "High Regret", color: "text-red-400", icon: AlertTriangle };
    };

    const regretLevel = getRegretLevel(totalRegretScore);
    const RegretIcon = regretLevel.icon;

    // Sort attributes by regret score (highest first)
    const sortedAttributes = Object.entries(attributes)
        .sort(([, a], [, b]) => b.regretScore - a.regretScore)
        .filter(([, attr]) => attr.regretScore >= 4 || attr.topComplaints.length > 0);

    if (sortedAttributes.length === 0) {
        return null;
    }

    return (
        <div className="px-8 py-8 border-t border-white/10">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Regret Meter</h3>
                    <p className="text-sm text-white/50">Common concerns from real users</p>
                </div>
            </div>

            {/* Overall Regret Gauge */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">Overall Regret Level</span>
                    <div className={`flex items-center gap-2 ${regretLevel.color}`}>
                        <RegretIcon size={16} />
                        <span className="text-sm font-medium">{regretLevel.label}</span>
                    </div>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${totalRegretScore * 10}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${totalRegretScore <= 3
                                ? "bg-gradient-to-r from-green-500 to-green-400"
                                : totalRegretScore <= 6
                                    ? "bg-gradient-to-r from-yellow-500 to-orange-400"
                                    : "bg-gradient-to-r from-orange-500 to-red-500"
                            }`}
                    />
                </div>
                <div className="flex justify-between mt-1 text-xs text-white/40">
                    <span>Low</span>
                    <span>Moderate</span>
                    <span>High</span>
                </div>
            </div>

            {/* Top Regret Categories */}
            <div className="space-y-4">
                {sortedAttributes.slice(0, 3).map(([attrName, attr]) => (
                    <motion.div
                        key={attrName}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="p-4 bg-white/5 rounded-xl border border-white/10"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white">{attrName}</span>
                            <span className={`text-xs ${FREQUENCY_COLORS[attr.frequency]}`}>
                                {FREQUENCY_LABELS[attr.frequency]}
                            </span>
                        </div>

                        {/* Mini progress bar */}
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                            <div
                                style={{ width: `${attr.regretScore * 10}%` }}
                                className={`h-full rounded-full ${attr.regretScore <= 3
                                        ? "bg-green-500"
                                        : attr.regretScore <= 6
                                            ? "bg-yellow-500"
                                            : "bg-red-500"
                                    }`}
                            />
                        </div>

                        {/* Top complaints */}
                        {attr.topComplaints.length > 0 && (
                            <ul className="space-y-1">
                                {attr.topComplaints.slice(0, 2).map((complaint, i) => (
                                    <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                                        <span className="text-white/30 mt-1">•</span>
                                        <span>{complaint}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </motion.div>
                ))}
            </div>

            <p className="mt-4 text-xs text-white/40 text-center">
                Based on aggregated user feedback from Reddit, XDA, and tech publications
            </p>
        </div>
    );
}

export default RegretMeter;
