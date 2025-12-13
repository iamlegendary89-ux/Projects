"use server";

import { readFile } from "fs/promises";
import path from "path";

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

interface RegretSentimentsFile {
    regretData: Record<string, PhoneRegretData>;
}

/**
 * Get regret data for a specific phone from regret-sentiments.json
 */
export async function getRegretData(phoneId: string): Promise<PhoneRegretData | null> {
    try {
        const filePath = path.join(process.cwd(), "data", "regret-sentiments.json");
        const fileContent = await readFile(filePath, "utf-8");
        const data = JSON.parse(fileContent) as RegretSentimentsFile;

        return data.regretData[phoneId] || null;
    } catch (error) {
        console.error("Failed to load regret data:", error);
        return null;
    }
}
