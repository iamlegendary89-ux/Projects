"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect high contrast preference from system settings
 * and allow manual override via toggle
 */
export function useHighContrast() {
    const [prefersHighContrast, setPrefersHighContrast] = useState(false);
    const [userOverride, setUserOverride] = useState<boolean | null>(null);

    useEffect(() => {
        // Check localStorage for user preference
        const stored = localStorage.getItem("highContrast");
        if (stored !== null) {
            setUserOverride(stored === "true");
        }

        // Check system preference (prefers-contrast: more)
        const mediaQuery = window.matchMedia("(prefers-contrast: more)");
        setPrefersHighContrast(mediaQuery.matches);

        const handleChange = (event: MediaQueryListEvent) => {
            setPrefersHighContrast(event.matches);
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    // User override takes precedence over system preference
    const shouldUseHighContrast = userOverride ?? prefersHighContrast;

    const toggleHighContrast = () => {
        const newValue = !shouldUseHighContrast;
        setUserOverride(newValue);
        localStorage.setItem("highContrast", String(newValue));

        // Toggle high-contrast class on document
        if (newValue) {
            document.documentElement.classList.add("high-contrast");
        } else {
            document.documentElement.classList.remove("high-contrast");
        }
    };

    // Apply high contrast on initial load
    useEffect(() => {
        if (shouldUseHighContrast) {
            document.documentElement.classList.add("high-contrast");
        }
    }, [shouldUseHighContrast]);

    return {
        shouldUseHighContrast,
        prefersHighContrast,
        userOverride,
        toggleHighContrast,
    };
}

export default useHighContrast;
