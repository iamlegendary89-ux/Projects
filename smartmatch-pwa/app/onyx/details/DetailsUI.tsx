"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Cpu, Battery, ChevronLeft, Check, X, Smartphone, Zap, Monitor, Camera } from "lucide-react";

import { PhoneImage } from "@/components/onyx-ui/PhoneImage";
import { FeedbackButtons } from "@/components/onyx-ui/FeedbackButtons";
import { ShareButton } from "@/components/onyx-ui/ShareButton";
import { RegretMeter } from "@/components/onyx-ui/RegretMeter";
import { StaticBackground } from "@/components/onyx-ui/StaticBackground";


// ==========================================
// TYPES
// ==========================================
interface AttributeScore {
    score?: number | null;
    explanation?: string;
    val?: string;
}

interface PhoneData {
    brand?: string;
    model?: string;
    category?: string;
    tagline?: string;
    onePageSummary?: string;
    pros?: string[];
    cons?: string[];
    attributes?: Record<string, AttributeScore>;
    metadata?: {
        confidence?: number;
        sourceNames?: string[];
        sourceCount?: number;
        processingTimeMs?: number;
    };
}

// ==========================================
// COMPONENT: X-RAY HEADER
// ==========================================
const XRayHeader = ({ data, phoneId }: { data: PhoneData; phoneId?: string | undefined }) => {
    const { scrollY } = useScroll();
    const skinOpacity = useTransform(scrollY, [0, 300], [1, 0]);
    const skeletonScale = useTransform(scrollY, [0, 300], [1, 1.1]);

    return (
        <div className="relative h-[60vh] w-full flex items-center justify-center overflow-hidden sticky top-0 z-0 pointer-events-none">
            {/* Hero Image Background */}
            {phoneId && (
                <div className="absolute inset-0 z-0 flex items-center justify-center">
                    <div className="w-72 h-72 md:w-96 md:h-96 rounded-full overflow-hidden opacity-30 blur-sm">
                        <PhoneImage
                            phoneId={phoneId}
                            alt={`${data.brand} ${data.model}`}
                            width={400}
                            height={400}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            )}


            {/* SKELETON */}
            <motion.div
                style={{ scale: skeletonScale }}
                className="absolute z-0 w-64 h-[500px] border-2 border-blue-500/30 rounded-[3rem] p-4 flex flex-col gap-4"
            >
                <div className="w-full h-1/4 border border-blue-500/20 rounded-2xl relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                    <Cpu className="text-blue-500/50 w-12 h-12 animate-pulse" />
                </div>
                <div className="w-full h-1/2 border border-blue-500/20 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    <Battery className="w-16 h-16 text-blue-500/50 rotate-90" />
                </div>
                <div className="w-full h-1/4 border border-blue-500/20 rounded-2xl opacity-50" />
            </motion.div>

            {/* SKIN */}
            <motion.div
                style={{ opacity: skinOpacity }}
                className="absolute z-10 w-64 h-[500px] bg-gradient-to-br from-gray-700 to-gray-900 rounded-[3rem] shadow-2xl flex items-center justify-center border border-white/10"
            >
                <div className="absolute top-4 w-1/3 h-6 bg-black rounded-full" />
                <span className="text-white/20 font-bold tracking-widest text-2xl rotate-90">{data.brand?.toUpperCase()}</span>
            </motion.div>

            {/* TEXT */}
            <div className="absolute bottom-10 left-4 z-20">
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-5xl md:text-7xl font-thin tracking-tighter text-white uppercase"
                >
                    {data.model}
                </motion.h1>
                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-blue-400 tracking-widest uppercase mt-2"
                >
                    {data.tagline || `${data.category || 'Flagship'} Class`}
                </motion.p>
            </div>
        </div>
    );
};

// ==========================================
// COMPONENT: LIVING SPECS (MAPPED)
// ==========================================
const LivingSpecs = ({ data }: { data: PhoneData }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* 1. PERFORMANCE */}
        <div className="p-8 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
            <div className="absolute top-4 right-4 text-white/20"><Cpu /></div>
            <h3 className="text-white/50 uppercase tracking-widest text-sm mb-6">Processing Power</h3>
            <div className="flex items-center gap-6">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10 / (data.attributes?.Performance?.score || 1), repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-blue-500/50 flex items-center justify-center"
                >
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full blur-md" />
                </motion.div>
                <div>
                    <div className="text-2xl font-bold text-white max-w-[150px] leading-tight">{data.attributes?.Performance?.val || "High Performance"}</div>
                    <div className="text-blue-400 text-sm mt-1">Score: {data.attributes?.Performance?.score?.toFixed(1)}/10</div>
                </div>
            </div>
        </div>

        {/* 2. BATTERY */}
        <div className="p-8 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-green-500/30 transition-colors">
            <div className="absolute top-4 right-4 text-white/20"><Zap /></div>
            <h3 className="text-white/50 uppercase tracking-widest text-sm mb-6">Endurance</h3>
            <div className="relative w-full h-20 bg-black/50 rounded-2xl overflow-hidden border border-white/10">
                <motion.div
                    initial={{ width: "0%" }}
                    whileInView={{ width: `${(data.attributes?.["Battery Endurance"]?.score || 0) * 10}%` }}
                    transition={{ duration: 1.5, type: "spring" }}
                    className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-400"
                />
                <div className="absolute inset-0 flex items-center justify-center z-10 text-white font-bold text-xl mix-blend-overlay">
                    {data.attributes?.["Battery Endurance"]?.val || "All Day Battery"}
                </div>
            </div>
        </div>

        {/* 3. CAMERA */}
        <div className="p-8 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-pink-500/30 transition-colors">
            <div className="absolute top-4 right-4 text-white/20"><Camera /></div>
            <h3 className="text-white/50 uppercase tracking-widest text-sm mb-6">Optics</h3>
            <div className="flex items-center justify-between">
                <div className="relative w-16 h-16 rounded-full border-4 border-pink-500/20 flex items-center justify-center">
                    <div className="w-12 h-12 bg-pink-500 rounded-full animate-pulse blur-md opacity-50" />
                    <div className="absolute inset-0 border-t-2 border-pink-400 rounded-full animate-spin" />
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-white">{data.attributes?.Camera?.score?.toFixed(1)}</div>
                    <div className="text-pink-400 text-xs">{data.attributes?.Camera?.val || "Pro Camera System"}</div>
                </div>
            </div>
        </div>

        {/* 4. SOFTWARE */}
        <div className="p-8 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-yellow-500/30 transition-colors">
            <div className="absolute top-4 right-4 text-white/20"><Monitor /></div>
            <h3 className="text-white/50 uppercase tracking-widest text-sm mb-6">Intelligence</h3>
            <div className="flex items-center gap-4">
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(data.attributes?.["Software Experience"]?.score || 0) * 10}%` }}
                        className="h-full bg-yellow-400"
                    />
                </div>
                <div className="text-yellow-400 font-bold">{data.attributes?.["Software Experience"]?.score}</div>
            </div>
            <div className="mt-2 text-right text-xs text-white/60">{data.attributes?.["Software Experience"]?.val}</div>
        </div>

        {/* 5. DESIGN & BUILD */}
        <div className="p-8 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-gray-400/30 transition-colors">
            <div className="absolute top-4 right-4 text-white/20"><Smartphone /></div>
            <h3 className="text-white/50 uppercase tracking-widest text-sm mb-2">Build Quality</h3>
            <div className="flex flex-col items-center py-2">
                <div className="w-full text-center text-3xl font-black text-gray-200 tracking-tighter">
                    {data.attributes?.["Design & Build"]?.val?.split(' ')[0]?.toUpperCase() ?? 'PREMIUM'}
                </div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/50 to-transparent my-2" />
                <div className="text-xs text-gray-400">IP68 • Flagship Build</div>
                <div className="mt-4 text-2xl font-bold text-white">{data.attributes?.["Design & Build"]?.score} / 10</div>
            </div>
        </div>

        {/* 6. LONGEVITY */}
        <div className="p-8 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
            <div className="absolute top-4 right-4 text-white/20"><Check /></div>
            <h3 className="text-white/50 uppercase tracking-widest text-sm mb-6">Value / Life</h3>
            <div className="flex items-end justify-between">
                <div className="flex gap-1 items-end h-16">
                    {[1, 2, 3, 4, 5].map(i => (
                        <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${i * 20}%` }}
                            className="w-4 bg-cyan-500/20 rounded-t-sm border-t border-cyan-500/50"
                        />
                    ))}
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-white">{data.attributes?.["Longevity Value"]?.score}</div>
                    <div className="text-cyan-400 text-xs mt-1">Long Term Update Support</div>
                </div>
            </div>
        </div>

        {/* 7. DISPLAY (Wide) */}
        <div className="p-8 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-colors col-span-1 md:col-span-2">
            <div className="absolute top-4 right-4 text-white/20"><Monitor /></div>
            <h3 className="text-white/50 uppercase tracking-widest text-sm mb-2">Visual Fidelity</h3>
            <div className="flex justify-between items-end relative z-10">
                <div className="text-3xl font-bold text-white max-w-xs">{data.attributes?.Display?.val || "OLED Display"}</div>
                <div className="text-purple-400 text-5xl font-black">{data.attributes?.Display?.score?.toFixed(1)}</div>
            </div>
            {/* Glow Effect based on score */}
            <div
                className="absolute bottom-[-50px] left-1/2 -translate-x-1/2 w-full h-32 bg-purple-500/30 blur-[60px] rounded-full pointer-events-none"
                style={{ opacity: (data.attributes?.Display?.score || 0) / 10 }}
            />
        </div>
    </div>
);

// ==========================================
// COMPONENT: HOLOGRAPHIC LIST (PROS/CONS)
// ==========================================
const HoloList = ({ data }: { data: PhoneData }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 mt-8">
        {/* PROS - LEFT ALIGNED */}
        <div className="space-y-4">
            <h3 className="text-cyan-400 uppercase tracking-widest text-xs font-bold mb-4 pl-2 border-l-2 border-cyan-500">System Advantages</h3>
            {data.pros?.map((pro: string, i: number) => (
                <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 text-sm text-cyan-100/80 bg-cyan-900/10 p-3 rounded-r-xl border-l border-cyan-500/30 backdrop-blur-sm"
                >
                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    {pro}
                </motion.div>
            ))}
        </div>

        {/* CONS - RIGHT ALIGNED */}
        <div className="space-y-4">
            <h3 className="text-red-400 uppercase tracking-widest text-xs font-bold mb-4 pl-2 border-l-2 border-red-500">Critical Flaws</h3>
            {data.cons?.map((con: string, i: number) => (
                <motion.div
                    key={i}
                    initial={{ x: 20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 text-sm text-red-100/80 bg-red-900/10 p-3 rounded-l-xl border-r border-red-500/30 backdrop-blur-sm md:text-right md:flex-row-reverse"
                >
                    <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    {con}
                </motion.div>
            ))}
        </div>
    </div>
);

// ==========================================
// COMPONENT: TERMINAL VERDICT (CYAN)
// ==========================================
const TerminalVerdict = ({ data }: { data: PhoneData }) => {
    const [text, setText] = useState("");
    const fullText = data.onePageSummary || "Analysis pending...";

    useEffect(() => {
        if (!data.onePageSummary) return;
        let i = 0;
        const interval = setInterval(() => {
            setText(fullText.slice(0, i));
            i++;
            if (i > fullText.length) clearInterval(interval);
        }, 8); // Faster typing for long text
        return () => clearInterval(interval);
    }, [fullText]);

    return (
        <div className="p-8 mx-4 mt-12 bg-black/40 border border-blue-500/20 rounded-xl font-mono relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-cyan-500/50 to-blue-500/0 opacity-50" />
            <div className="text-cyan-500/50 text-xs mb-4 tracking-widest uppercase"> // OSET_ANALYSIS_V7.LOG </div>
            <p className="text-cyan-100/90 text-md md:text-lg leading-relaxed">
                {text}
                <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            </p>
            <div className="mt-6 flex items-center gap-3">
                <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold rounded tracking-wider shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                    CONFIDENCE: {((data.metadata?.confidence || 0) * 100).toFixed(1)}%
                </div>
                <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold rounded tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    SOURCES: {data.metadata?.sourceCount || 0}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// Types for regret data
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

// PAGE COMPONENT
// ==========================================
export default function DetailsUI({ data, phoneId, regretData }: { data: PhoneData; phoneId?: string; regretData?: PhoneRegretData | null }) {
    if (!data) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Data Unavailable</div>;

    // Use attributes if available, otherwise fall back to originalAttributes
    const attrs = data.attributes || (data as unknown as { originalAttributes?: Record<string, AttributeScore> }).originalAttributes || {};
    const attrValues = Object.values(attrs) as Array<{ score?: number }>;
    const totalScore = attrValues.reduce((acc, curr) => acc + (curr?.score || 0), 0);
    const skillScore = Math.round((totalScore / (attrValues.length || 1)) * 10);

    return (
        <main className="min-h-screen bg-[#050505] font-sans selection:bg-blue-500 selection:text-white pb-20 overflow-x-hidden">
            {/* Static Background */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
                <StaticBackground primaryColor="#ffffff" />
            </div>

            <div className="fixed top-6 left-6 right-6 z-50 flex items-center justify-between">
                <a href="/onyx/rankings" className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white/50 hover:text-white transition-colors">
                    <ChevronLeft size={16} /> Back
                </a>
                <ShareButton
                    title={`${data.brand} ${data.model} - SmartMatch Analysis`}
                    text={`Check out the OSET analysis for ${data.brand} ${data.model}!`}
                    variant="icon"
                    className="bg-black/50 backdrop-blur-md border border-white/10 rounded-full"
                />
            </div>

            <XRayHeader data={data} phoneId={phoneId} />

            <div className="relative z-10 bg-[#050505]/80 backdrop-blur-xl min-h-screen -mt-10 rounded-t-[3rem] border-t border-white/10 pt-10 shadow-[0_-50px_100px_rgba(0,0,0,1)]">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between px-8 mb-12">
                        <div className="text-white/40 text-sm tracking-widest">OSET SCORE</div>
                        <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                            {skillScore}
                        </div>
                    </div>

                    <LivingSpecs data={{ ...data, attributes: attrs }} />
                    <HoloList data={data} />
                    <TerminalVerdict data={data} />

                    {/* Regret Meter */}
                    {phoneId && regretData && (
                        <RegretMeter phoneId={phoneId} regretData={regretData} />
                    )}

                    {/* Feedback Section */}
                    {phoneId && (
                        <div className="px-8 py-6 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <span className="text-white/50 text-sm">Was this analysis helpful?</span>
                                <FeedbackButtons phoneId={phoneId} />
                            </div>
                        </div>
                    )}

                    <div className="h-40" />
                </div>
            </div>
        </main>
    );
}
