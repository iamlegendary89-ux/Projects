"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Zap, Camera, Battery, ChevronLeft, Monitor, Cpu, Shield, Clock } from "lucide-react";
import Link from "next/link";

import { HoloCard } from "@/components/onyx-ui/HoloCard";
import { PhoneImage } from "@/components/onyx-ui/PhoneImage";
import { StaticBackground } from "@/components/onyx-ui/StaticBackground";


// ==========================================
// TYPES
// ==========================================
interface PhoneRanking {
    id?: string | null;
    name?: string | null;
    phone_id?: string | null;
    brand?: string | null;
    model?: string | null;
    category?: string | null;
    overall_score?: number | null;
    score?: number | null;
    camera_score?: number | null;
    performance_score?: number | null;
    battery_score?: number | null;
    display_score?: number | null;
    software_score?: number | null;
    design_score?: number | null;
    longevity_score?: number | null;
}

// ==========================================
// COMPONENT: 3D PODIUM
// ==========================================
const Podium = ({ winners }: { winners: PhoneRanking[] }) => {
    // Fill empty slots if less than 3 winners
    const podiumWinners = [...winners];
    while (podiumWinners.length < 3) {
        podiumWinners.push({ name: "TBD", score: 0 });
    }

    return (
        <div className="relative h-[350px] md:h-[500px] w-full max-w-4xl mx-auto flex items-end justify-center gap-2 sm:gap-4 md:gap-12 perspective-1000 px-2">
            {/* 2nd Place */}
            {podiumWinners[1] && (
                <PodiumStep phone={podiumWinners[1]} rank={2} height={300} delay={0.2} color="from-slate-300 to-slate-500" />
            )}

            {/* 1st Place */}
            {podiumWinners[0] && (
                <PodiumStep phone={podiumWinners[0]} rank={1} height={400} delay={0} color="from-amber-300 to-amber-600" isKing />
            )}

            {/* 3rd Place */}
            {podiumWinners[2] && (
                <PodiumStep phone={podiumWinners[2]} rank={3} height={250} delay={0.4} color="from-orange-700 to-amber-900" />
            )}
        </div>
    );
};

interface PodiumStepProps {
    phone: PhoneRanking;
    rank: number;
    height: number;
    delay: number;
    color: string;
    isKing?: boolean;
}

const PodiumStep = ({ phone, rank, height, delay, color, isKing }: PodiumStepProps) => {
    const CardContent = (
        <motion.div
            animate={{ y: isKing ? [0, -20, 0] : [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-32 md:w-48"
        >
            <HoloCard
                intensity="high"
                isActive={!!isKing}
                className={`
                    w-full flex flex-col items-center cursor-pointer 
                    ${isKing ? 'border-amber-500/30' : ''}
                `}
                noPadding
            >
                <div className="p-4 flex flex-col items-center">
                    <div className="w-16 h-24 md:w-24 md:h-36 rounded-xl mb-4 overflow-hidden bg-white/5 border border-white/5">
                        <PhoneImage
                            phoneId={phone.id || phone.phone_id || ''}
                            alt={phone.name || ''}
                            width={96}
                            height={144}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="text-center">
                        {isKing && <div className="text-amber-400 text-xs font-bold tracking-widest mb-1">THE KING</div>}
                        <div className="text-white font-medium text-sm md:text-lg leading-tight line-clamp-2">{phone.name}</div>
                        <div className="mt-2 text-3xl font-bold text-white/90">{phone.score}</div>
                    </div>
                </div>
            </HoloCard>
        </motion.div>
    );

    return (
        <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay }}
            className="relative flex flex-col items-center group"
        >
            {/* Floating Phone Card */}
            {phone.id ? (
                <Link href={`/onyx/phone/${phone.id}`}>
                    {CardContent}
                </Link>
            ) : (
                CardContent
            )}

            {/* The Plinth */}
            <div
                style={{ height }}
                className={`w-32 md:w-48 mt-4 rounded-t-lg bg-gradient-to-b ${color} opacity-20 backdrop-blur-md border-t border-white/20 relative overflow-hidden`}
            >
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white/20 to-transparent" />

                {/* Rank Number */}
                <div className="absolute bottom-4 left-0 right-0 text-center text-white/10 font-black text-6xl md:text-8xl">
                    {rank}
                </div>
            </div>
        </motion.div>
    );
};

const CATEGORIES = [
    { id: "overall", label: "Overall", icon: Trophy },
    { id: "camera", label: "Camera", icon: Camera },
    { id: "perf", label: "Performance", icon: Cpu },
    { id: "battery", label: "Battery", icon: Battery },
    { id: "display", label: "Display", icon: Monitor },
    { id: "software", label: "Software", icon: Shield },
    { id: "design", label: "Design", icon: Zap },
    { id: "longevity", label: "Value", icon: Clock },
];

interface RankingsUIProps {
    rankings: PhoneRanking[];
}

export default function RankingsUI({ rankings }: RankingsUIProps) {
    const [activeCat, setActiveCat] = useState("overall");

    const getSortedRankings = () => {
        const sorted = [...rankings];
        switch (activeCat) {
            case "camera":
                return sorted.sort((a, b) => (Number(b.camera_score) || 0) - (Number(a.camera_score) || 0));
            case "perf":
                return sorted.sort((a, b) => (Number(b.performance_score) || 0) - (Number(a.performance_score) || 0));
            case "battery":
                return sorted.sort((a, b) => (Number(b.battery_score) || 0) - (Number(a.battery_score) || 0));
            case "display":
                return sorted.sort((a, b) => (Number(b.display_score) || 0) - (Number(a.display_score) || 0));
            case "software":
                return sorted.sort((a, b) => (Number(b.software_score) || 0) - (Number(a.software_score) || 0));
            case "design":
                return sorted.sort((a, b) => (Number(b.design_score) || 0) - (Number(a.design_score) || 0));
            case "longevity":
                return sorted.sort((a, b) => (Number(b.longevity_score) || 0) - (Number(a.longevity_score) || 0));
            default:
                return sorted.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
        }
    };

    const displayRankings = getSortedRankings();

    return (
        <main className="min-h-screen bg-[#050505] font-sans selection:bg-[#00f0ff] text-white pb-20 overflow-x-hidden">
            {/* Static Background */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
                <StaticBackground primaryColor="#ffffff" />
            </div>

            <div className="relative z-10 container mx-auto px-4 pt-12">
                {/* Header */}
                <header className="flex items-center justify-between mb-16">
                    <a href="/onyx" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                        <ChevronLeft /> Back to Onyx
                    </a>
                    <h1 className="text-2xl font-light tracking-widest uppercase text-white/80">OSET v7 Leaderboard</h1>
                </header>

                {/* Filter Tabs - Horizontal Scroll on Mobile */}
                <div className="flex justify-center mb-20 overflow-x-auto scrollbar-hide">
                    <div className="p-1 bg-white/5 rounded-full backdrop-blur-md border border-white/10 flex gap-1 md:gap-2 min-w-max">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCat(cat.id)}
                                className={`
                            relative px-6 py-2 rounded-full text-sm font-medium transition-all duration-300
                            ${activeCat === cat.id ? 'text-black' : 'text-white/60 hover:text-white'}
                          `}
                            >
                                {activeCat === cat.id && (
                                    <motion.div
                                        layoutId="bubble"
                                        className="absolute inset-0 bg-white rounded-full mix-blend-screen"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    <cat.icon size={14} /> {cat.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* THE PODIUM (Top 3) */}
                <Podium winners={displayRankings.slice(0, 3)} />

                {/* THE REST (Glass List) */}
                <div className="max-w-3xl mx-auto mt-20 space-y-4">
                    {displayRankings.slice(3).map((phone, i) => (
                        <Link href={`/onyx/phone/${phone.id}`} key={phone.id || phone.name}>
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <HoloCard className="group flex items-center justify-between p-6 hover:bg-white/10 transition-all cursor-pointer">
                                    <div className="flex items-center gap-6">
                                        <div className="text-2xl font-bold text-white/20 w-8">{i + 4}</div>
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                                            <PhoneImage
                                                phoneId={phone.id || ''}
                                                alt={phone.name || ''}
                                                width={48}
                                                height={48}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <div className="text-lg font-medium">{phone.name}</div>
                                            <div className="text-xs text-white/40">
                                                {phone.category ? `${phone.category} Tier` : 'Flagship Tier'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                                            <div style={{ width: `${phone.score}%` }} className="h-full bg-white/50" />
                                        </div>
                                        <div className="text-xl font-bold">{phone.score}</div>
                                    </div>
                                </HoloCard>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
