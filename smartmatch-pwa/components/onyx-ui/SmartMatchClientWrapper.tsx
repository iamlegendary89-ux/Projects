"use client";

import dynamic from "next/dynamic";
import { PhoneData } from "@/lib/phones";

const SmartMatchClient = dynamic(() => import("./SmartMatchClient"), { ssr: false });

interface WrapperProps {
    phones: PhoneData[];
}

export default function SmartMatchClientWrapper({ phones }: WrapperProps) {
    return <SmartMatchClient phones={phones} />;
}
