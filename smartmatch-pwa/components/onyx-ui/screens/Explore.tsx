import React from "react";
import { motion } from "framer-motion";
import Image from "next/image"; // Optimization
import { Card } from "@/components/onyx-ui/Card";
import { Button } from "@/components/onyx-ui/Button";
import { Checkbox, Slider } from "@/components/onyx-ui/Input";
import { PhoneData } from "@/lib/phones";

interface ExploreProps {
    phones: PhoneData[];
    onSelectPhone: (phone: PhoneData) => void;
}

const Explore: React.FC<ExploreProps> = ({ phones, onSelectPhone }) => {
    return (
        <div className="w-full p-4 md:p-8 space-y-8">
            {/* ... Header ... */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-heading font-bold text-pure-light">The Collection</h2>
                    <p className="text-pure-light/60">Alternatives that might still speak to you.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm">Filter</Button>
                    <Button variant="ghost" size="sm">Sort</Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Filters Sidebar (Desktop) */}
                <aside className="hidden lg:block w-64 space-y-8 shrink-0">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-pure-light/50 uppercase tracking-wider">Budget</h3>
                        <Slider defaultValue={[50]} max={100} step={1} />
                        <div className="flex justify-between text-xs text-pure-light/40">
                            <span>$300</span>
                            <span>$2000+</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-pure-light/50 uppercase tracking-wider">Brand</h3>
                        <div className="space-y-2">
                            {["Apple", "Samsung", "Google", "Sony", "OnePlus"].map((brand) => (
                                <div key={brand} className="flex items-center gap-2">
                                    <Checkbox id={brand} />
                                    <label htmlFor={brand} className="text-sm text-pure-light/80 cursor-pointer hover:text-onyx-primary transition-colors">
                                        {brand}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
                    {phones.map((phone, index) => (
                        <motion.div
                            key={phone.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card variant="glass" className="group h-full flex flex-col hover:border-onyx-primary/30 transition-colors" hoverEffect={true}>
                                <div className="aspect-[4/3] bg-black/20 rounded-lg mb-4 overflow-hidden relative">
                                    {/* Placeholder Image */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent group-hover:scale-105 transition-transform duration-500" />
                                    {phone.image && (
                                        <Image
                                            src={phone.image}
                                            alt={`${phone.brand} ${phone.model}`}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            className="object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                        />
                                    )}
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs font-medium text-onyx-primary border border-onyx-primary/20">
                                        {Math.round(phone.overallScore * 10)}% Match
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <h3 className="text-xl font-heading font-semibold">{phone.brand} {phone.model}</h3>
                                    <p className="text-sm text-pure-light/60 line-clamp-2">{phone.onePageSummary}</p>
                                </div>

                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                                    <span className="font-medium text-pure-light">{phone.price}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="hover:text-onyx-primary"
                                        onClick={() => onSelectPhone(phone)}
                                    >
                                        View
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Explore;
