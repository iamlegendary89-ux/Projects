"use client";

import Image from "next/image";
import { useState } from "react";

interface PhoneImageProps {
    phoneId: string;
    alt?: string;
    className?: string;
    width?: number;
    height?: number;
    priority?: boolean;
}

/**
 * PhoneImage component that displays hero images for phones.
 * Falls back to a placeholder gradient if image is not found.
 */
export function PhoneImage({
    phoneId,
    alt,
    className = "",
    width = 200,
    height = 200,
    priority = false,
}: PhoneImageProps) {
    const [hasError, setHasError] = useState(false);

    // Image path for existing hero images
    const imageSrc = `/api/phone-image/${phoneId}`;

    if (hasError) {
        return (
            <div
                className={`flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10 ${className}`}
                style={{ width, height }}
            >
                <div className="text-white/30 text-xs text-center px-2">
                    {alt || phoneId.replace(/_/g, " ")}
                </div>
            </div>
        );
    }

    return (
        <Image
            src={imageSrc}
            alt={alt || `${phoneId.replace(/_/g, " ")} image`}
            width={width}
            height={height}
            className={className}
            priority={priority}
            onError={() => setHasError(true)}
            unoptimized // Using custom API route
        />
    );
}

export default PhoneImage;
