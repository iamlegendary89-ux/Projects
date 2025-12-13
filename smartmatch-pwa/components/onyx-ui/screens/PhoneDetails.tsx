"use client";

import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";
import { PhoneData } from "@/lib/phones";
import { Card } from "@/components/onyx-ui/Card";
import { Button } from "@/components/onyx-ui/Button";
import { SpecsBarChart } from "@/components/onyx-ui/SpecsBarChart";
import { DeepDiveSpecs } from "@/components/onyx-ui/DeepDiveSpecs";

interface PhoneDetailsProps {
    phone: PhoneData;
    onClose: () => void;
}

const PhoneDetails: React.FC<PhoneDetailsProps> = ({ phone, onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                <Card variant="glass" className="relative overflow-hidden p-0 border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/20 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
                        aria-label="Close details"
                    >
                        <X size={24} />
                    </button>

                    <div className="flex flex-col md:flex-row">
                        {/* Hero Section */}
                        <div className="w-full md:w-2/5 relative min-h-[300px] md:min-h-[500px] bg-gradient-to-br from-white/5 to-transparent">
                            <div className="absolute inset-0 flex items-center justify-center p-8">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="relative w-full h-full"
                                >
                                    {phone.image && (
                                        <Image
                                            src={phone.image}
                                            alt={phone.model}
                                            fill
                                            className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                                            sizes="(max-width: 768px) 100vw, 40vw"
                                        />
                                    )}
                                </motion.div>
                            </div>

                            {/* Brand Badge */}
                            <div className="absolute top-6 left-6 px-3 py-1 bg-onyx-primary/20 border border-onyx-primary/30 rounded-full text-xs font-bold text-onyx-primary uppercase tracking-wider backdrop-blur-md">
                                {phone.brand}
                            </div>
                        </div>

                        {/* Details Content */}
                        <div className="w-full md:w-3/5 p-8 md:p-10 space-y-8 bg-black/20">
                            {/* Header */}
                            <div className="space-y-2">
                                <motion.h2
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-3xl md:text-4xl font-heading font-bold text-white"
                                >
                                    {phone.model}
                                </motion.h2>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-lg text-pure-light/70 font-light leading-relaxed"
                                >
                                    {phone.onePageSummary}
                                </motion.p>
                            </div>

                            {/* Price & Score */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center gap-6 pb-6 border-b border-white/10"
                            >
                                <div>
                                    <span className="block text-sm text-pure-light/50 uppercase tracking-widest">Price</span>
                                    <span className="text-2xl font-semibold text-onyx-primary">{phone.price}</span>
                                </div>
                                <div className="h-10 w-[1px] bg-white/10" />
                                <div>
                                    <span className="block text-sm text-pure-light/50 uppercase tracking-widest">Match</span>
                                    <span className="text-2xl font-semibold text-white">{Math.round(phone.overallScore * 10)}%</span>
                                </div>
                            </motion.div>

                            {/* Key Attributes - Bar Charts */}
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="py-4"
                            >
                                <SpecsBarChart phone={phone} />
                            </motion.div>

                            {/* Pros & Cons - The Reality Check */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="grid grid-cols-2 gap-6 pb-6 border-b border-white/5"
                            >
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Pros</h4>
                                    <ul className="space-y-2">
                                        {phone.pros?.slice(0, 3).map((pro, i) => (
                                            <li key={i} className="flex gap-2 text-sm text-slate-300">
                                                <span className="text-emerald-500 shrink-0">+</span>
                                                <span className="opacity-90">{pro}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-rose-400 uppercase tracking-wider">Cons</h4>
                                    <ul className="space-y-2">
                                        {phone.cons?.slice(0, 3).map((con, i) => (
                                            <li key={i} className="flex gap-2 text-sm text-slate-300">
                                                <span className="text-rose-500 shrink-0">−</span>
                                                <span className="opacity-90">{con}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <DeepDiveSpecs phone={phone} />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="pt-4"
                            >
                                <Button className="w-full" onClick={() => window.open(`https://google.com/search?q=${phone.brand}+${phone.model}`, '_blank')}>
                                    Find Best Price
                                </Button>
                            </motion.div>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </motion.div>
    );
};

export default PhoneDetails;
