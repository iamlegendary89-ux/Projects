"use server";

import { db } from "@/lib/db";
import { feedback, upvoteCounts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

interface UpvoteResult {
    success: boolean;
    newCount?: number;
    error?: string;
}

interface ReportResult {
    success: boolean;
    error?: string;
}

/**
 * Submit an upvote for a phone.
 * Rate limited by phone ID + user IP (in production).
 */
export async function submitUpvote(phoneId: string): Promise<UpvoteResult> {
    try {
        // Insert the feedback record
        await db.insert(feedback).values({
            phoneId,
            feedbackType: "upvote",
        });

        // Upsert the count
        const result = await db
            .insert(upvoteCounts)
            .values({
                phoneId,
                count: 1,
            })
            .onConflictDoUpdate({
                target: upvoteCounts.phoneId,
                set: {
                    count: sql`${upvoteCounts.count} + 1`,
                    updatedAt: sql`now()`,
                },
            })
            .returning({ count: upvoteCounts.count });

        return {
            success: true,
            newCount: result[0]?.count || 1,
        };
    } catch (error) {
        console.error("Failed to submit upvote:", error);
        return {
            success: false,
            error: "Failed to submit upvote",
        };
    }
}

/**
 * Get upvote count for a phone
 */
export async function getUpvoteCount(phoneId: string): Promise<number> {
    try {
        const result = await db
            .select({ count: upvoteCounts.count })
            .from(upvoteCounts)
            .where(eq(upvoteCounts.phoneId, phoneId))
            .limit(1);

        return result[0]?.count || 0;
    } catch (error) {
        console.error("Failed to get upvote count:", error);
        return 0;
    }
}

/**
 * Submit a report for inaccurate information
 */
export async function submitReport(
    phoneId: string,
    category: "wrong_score" | "wrong_spec" | "outdated_info" | "missing_info" | "other",
    description: string
): Promise<ReportResult> {
    try {
        await db.insert(feedback).values({
            phoneId,
            feedbackType: "report",
            reportCategory: category,
            description,
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to submit report:", error);
        return {
            success: false,
            error: "Failed to submit report",
        };
    }
}
