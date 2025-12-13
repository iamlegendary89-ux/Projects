"use server";

import { db } from "@/lib/db";
import { dynamicPhones } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

/**
 * Get all phones ranked by overall score
 * Reads from dynamic_phones (post-OSET scores)
 */
export async function getRankings() {
    return db
        .select()
        .from(dynamicPhones)
        .orderBy(desc(dynamicPhones.overallScore));
}

/**
 * Get phone details by slug/id
 * Reads from dynamic_phones, includes full_data
 */
export async function getPhoneDetails(slug: string) {
    const results = await db
        .select()
        .from(dynamicPhones)
        .where(eq(dynamicPhones.id, slug))
        .limit(1);

    return results[0] || null;
}
