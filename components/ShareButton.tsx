"use client";

import { useState } from "react";
import { Share2, Copy, Check, Twitter, Facebook, Linkedin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ShareButtonProps {
    title: string;
    text?: string;
    url?: string;
    variant?: "icon" | "full";
    className?: string;
}

/**
 * ShareButton component using Web Share API with fallback
 */
export function ShareButton({
    title,
    text,
    url,
    variant = "full",
    className = "",
}: ShareButtonProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [copied, setCopied] = useState(false);

    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    const shareText = text || title;

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text: shareText,
                    url: shareUrl,
                });
            } catch (error) {
                // User cancelled or error occurred
                if ((error as Error).name !== "AbortError") {
                    setShowDropdown(true);
                }
            }
        } else {
            setShowDropdown(true);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                setShowDropdown(false);
            }, 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                setShowDropdown(false);
            }, 2000);
        }
    };

    const socialLinks = [
        {
            name: "Twitter",
            icon: Twitter,
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
        },
        {
            name: "Facebook",
            icon: Facebook,
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        },
        {
            name: "LinkedIn",
            icon: Linkedin,
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
        },
    ];

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={handleNativeShare}
                className={`
                    flex items-center gap-2 transition-all
                    ${variant === "icon"
                        ? "p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                        : "px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium"
                    }
                `}
                aria-label="Share"
            >
                <Share2 size={variant === "icon" ? 18 : 16} />
                {variant === "full" && <span>Share</span>}
            </button>

            <AnimatePresence>
                {showDropdown && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowDropdown(false)}
                        />

                        {/* Dropdown */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 mt-2 w-48 bg-[#1a1a2e] rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                        >
                            {/* Copy Link */}
                            <button
                                onClick={handleCopy}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <Check size={16} className="text-green-400" />
                                        <span className="text-green-400">Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} />
                                        <span>Copy Link</span>
                                    </>
                                )}
                            </button>

                            <div className="h-px bg-white/10" />

                            {/* Social Links */}
                            {socialLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 transition-colors"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    <link.icon size={16} />
                                    <span>{link.name}</span>
                                </a>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ShareButton;
