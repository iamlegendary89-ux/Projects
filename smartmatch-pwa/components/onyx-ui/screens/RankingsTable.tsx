"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneData } from "@/lib/phones";
import { cn } from "@/lib/utils";
import { Button } from "@/components/onyx-ui/Button";
import Link from "next/link";
import Image from "next/image";

interface RankingsTableProps {
    phones: PhoneData[];
}

type SortKey = "overallScore" | "Performance" | "Camera" | "Battery Endurance" | "Display" | "Design & Build" | "Software Experience" | "Longevity Value";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "overallScore", label: "Overall" },
    { key: "Camera", label: "Camera" },
    { key: "Performance", label: "Performance" },
    { key: "Battery Endurance", label: "Battery" },
    { key: "Display", label: "Display" },
    { key: "Software Experience", label: "Software" },
    { key: "Design & Build", label: "Design" },
    { key: "Longevity Value", label: "Longevity" },
];

export function RankingsTable({ phones }: RankingsTableProps) {
    const [activeSort, setActiveSort] = useState<SortKey>("overallScore");

    const sortedPhones = useMemo(() => {
        return [...phones].sort((a, b) => {
            const getScore = (p: PhoneData, k: SortKey) => {
                if (k === "overallScore") return p.overallScore;
                return p.attributes?.[k]?.score || 0;
            };

            const scoreA = getScore(a, activeSort);
            const scoreB = getScore(b, activeSort);

            return scoreB - scoreA; // Descending
        });
    }, [phones, activeSort]);

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <Link href="/" className="text-sm text-pure-light/50 hover:text-onyx-primary transition-colors mb-4 block">
                    &larr; Back to SmartMatch
                </Link>
                <h1 className="text-4xl md:text-5xl font-heading font-bold text-pure-light">
                    The Leaderboard
                </h1>
                <p className="text-xl text-pure-light/60 font-light max-w-2xl">
                    Objective rankings based on AI analysis of hundreds of expert reviews.
                    Data driven, not hype driven.
                </p>
            </div>

            {/* Metric Selector (Tabs) */}
            <div className="flex flex-wrap gap-2 pb-4 border-b border-white/10">
                {SORT_OPTIONS.map((option) => (
                    <button
                        key={option.key}
                        onClick={() => setActiveSort(option.key)}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                            activeSort === option.key
                                ? "bg-onyx-primary text-void-black shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                                : "bg-white/5 text-pure-light/60 hover:bg-white/10 hover:text-pure-light"
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-black/20 text-xs font-semibold uppercase tracking-wider text-pure-light/40">
                    <div className="col-span-1 text-center">Rank</div>
                    <div className="col-span-6 md:col-span-5">Model</div>
                    <div className="col-span-3 md:col-span-2 text-right">
                        {SORT_OPTIONS.find(o => o.key === activeSort)?.label} Score
                    </div>
                    <div className="col-span-2 md:col-span-2 text-right hidden md:block">Price</div>
                    <div className="col-span-2 text-right hidden md:block">Action</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-white/5">
                    <AnimatePresence mode="popLayout">
                        {sortedPhones.map((phone, index) => {
                            const score = activeSort === "overallScore"
                                ? (phone.overallScore || 0)
                                : phone.attributes?.[activeSort]?.score || 0;

                            const isTop3 = index < 3;

                            return (
                                <motion.div
                                    key={phone.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className={cn(
                                        "grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group",
                                        isTop3 ? "bg-onyx-primary/5" : ""
                                    )}
                                >
                                    {/* Rank */}
                                    <div className="col-span-1 flex justify-center">
                                        <span className={cn(
                                            "flex items-center justify-center w-8 h-8 rounded-full font-heading font-bold",
                                            index === 0 ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50" :
                                                index === 1 ? "bg-slate-400/20 text-slate-400 border border-slate-400/50" :
                                                    index === 2 ? "bg-amber-700/20 text-amber-700 border border-amber-700/50" :
                                                        "text-pure-light/40"
                                        )}>
                                            {index + 1}
                                        </span>
                                    </div>

                                    {/* Model */}
                                    <div className="col-span-6 md:col-span-5 flex items-center gap-4">
                                        <div className="relative w-12 h-16 rounded overflow-hidden bg-black/50 shrink-0 hidden sm:block">
                                            {phone.image && (
                                                <Image
                                                    src={phone.image}
                                                    alt={phone.model}
                                                    fill
                                                    className="object-cover opacity-80"
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-medium text-pure-light group-hover:text-onyx-primary transition-colors">
                                                {phone.brand} {phone.model}
                                            </div>
                                            <div className="text-xs text-pure-light/40 capitalize">{phone.category}</div>
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className="col-span-3 md:col-span-2 text-right">
                                        <span className={cn(
                                            "text-xl font-heading font-bold tabular-nums",
                                            score >= 9 ? "text-onyx-primary" :
                                                score >= 8 ? "text-emerald-400" :
                                                    "text-pure-light/60"
                                        )}>
                                            {score.toFixed(1)}
                                        </span>
                                    </div>

                                    {/* Price */}
                                    <div className="col-span-2 md:col-span-2 text-right hidden md:block text-pure-light/60 group-hover:text-white transition-colors">
                                        {phone.price}
                                    </div>

                                    {/* Action */}
                                    <div className="col-span-2 text-right hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="sm" className="h-8 text-xs">View</Button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
