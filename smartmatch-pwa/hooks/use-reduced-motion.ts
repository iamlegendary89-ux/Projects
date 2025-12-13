"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect reduced motion preference from system settings
 * and allow manual override via toggle
 */
export function useReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [userOverride, setUserOverride] = useState<boolean | null>(null);

    useEffect(() => {
        // Check localStorage for user preference
        const stored = localStorage.getItem("reducedMotion");
        if (stored !== null) {
            setUserOverride(stored === "true");
        }

        // Check system preference
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches);
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    // User override takes precedence over system preference
    const shouldReduceMotion = userOverride ?? prefersReducedMotion;

    const toggleReducedMotion = () => {
        const newValue = !shouldReduceMotion;
        setUserOverride(newValue);
        localStorage.setItem("reducedMotion", String(newValue));
    };

    return {
        shouldReduceMotion,
        prefersReducedMotion,
        userOverride,
        toggleReducedMotion,
    };
}

export default useReducedMotion;
