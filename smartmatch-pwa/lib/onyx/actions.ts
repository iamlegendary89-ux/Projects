"use server";

import { db } from "@/lib/db";
import { processedPhones } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getRankings() {
    try {
        const phones = await db.select({
            id: processedPhones.phone_id,
            name: processedPhones.model,
            brand: processedPhones.brand,
            score: processedPhones.overall_score,
            category: processedPhones.category,
            releaseDate: processedPhones.release_date,
            // Attribute Scores for Filtering
            camera_score: processedPhones.camera_score,
            battery_score: processedPhones.battery_score,
            performance_score: processedPhones.performance_score,
            software_score: processedPhones.software_score,
            design_score: processedPhones.design_score,
            display_score: processedPhones.display_score,
            longevity_score: processedPhones.longevity_score,
        })
            .from(processedPhones)
            .orderBy(desc(processedPhones.overall_score));

        return phones;
    } catch (error) {
        console.error("Failed to fetch rankings:", error);
        return [];
    }
}

export async function getPhoneDetails(phoneId: string) {
    console.log(`[getPhoneDetails] Fetching phone with ID: "${phoneId}"`);
    try {
        const phone = await db.select()
            .from(processedPhones)
            .where(eq(processedPhones.phone_id, phoneId))
            .limit(1);

        console.log(`[getPhoneDetails] Found ${phone.length} results for "${phoneId}"`);
        if (phone[0]) {
            console.log(`[getPhoneDetails] Phone data keys:`, Object.keys(phone[0]));
        }

        return phone[0] || null;
    } catch (error) {
        console.error(`[getPhoneDetails] Failed to fetch details for ${phoneId}:`, error);
        return null;
    }
}
