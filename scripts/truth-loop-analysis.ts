#!/usr/bin/env npx tsx
/**
 * Truth Loop Analysis Script
 * 
 * Analyzes user feedback (upvotes, reports, regret signals) to auto-tune
 * recommendation weights and update regret sentiments.
 * 
 * Runs nightly via GitHub Actions.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

// =============================================================================
// Configuration
// =============================================================================

const SUPABASE_URL = process.env["SUPABASE_URL"];
const SUPABASE_SERVICE_KEY = process.env["SUPABASE_SERVICE_KEY"];

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const WEIGHTS_PATH = join(process.cwd(), "data", "weights.json");
const REGRET_PATH = join(process.cwd(), "data", "regret-sentiments.json");

// =============================================================================
// Types
// =============================================================================

interface FeedbackRow {
    id: number;
    phone_id: string;
    feedback_type: "upvote" | "report";
    report_category?: "wrong_score" | "wrong_spec" | "outdated_info" | "missing_info" | "other";
    description?: string;
    created_at: string;
}

interface PhoneScore {
    phone_id: string;
    overall_score: number;
    camera_score: number;
    battery_score: number;
    performance_score: number;
    software_score: number;
    design_score: number;
    display_score: number;
    longevity_score: number;
}

interface Weights {
    version: string;
    updatedAt: string;
    attributes: {
        Camera: number;
        "Battery Endurance": number;
        Performance: number;
        "Software Experience": number;
        "Design & Build": number;
        Display: number;
        "Longevity Value": number;
    };
    regretMultipliers: {
        highRegret: number;
        mediumRegret: number;
        lowRegret: number;
    };
}

interface RegretData {
    regretData: Record<string, {
        phoneId: string;
        totalRegretScore: number;
        attributes: Record<string, {
            regretScore: number;
            frequency: "very_high" | "high" | "medium" | "low";
            topComplaints: string[];
        }>;
    }>;
    updatedAt: string;
}

// =============================================================================
// Analysis Functions
// =============================================================================

async function fetchRecentFeedback(days: number = 7): Promise<FeedbackRow[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });

    if (error) {
        console.error("❌ Failed to fetch feedback:", error.message);
        return [];
    }

    return data || [];
}

async function fetchPhoneScores(): Promise<Map<string, PhoneScore>> {
    const { data, error } = await supabase
        .from("dynamic_phones")
        .select("phone_id, overall_score, camera_score, battery_score, performance_score, software_score, design_score, display_score, longevity_score");

    if (error) {
        console.error("❌ Failed to fetch phone scores:", error.message);
        return new Map();
    }

    const map = new Map<string, PhoneScore>();
    for (const row of data || []) {
        map.set(row.phone_id, row);
    }
    return map;
}

function analyzeReports(feedback: FeedbackRow[]): Map<string, { category: string; count: number }[]> {
    const reports = feedback.filter(f => f.feedback_type === "report");
    const byPhone = new Map<string, Map<string, number>>();

    for (const report of reports) {
        if (!report.phone_id) continue;

        if (!byPhone.has(report.phone_id)) {
            byPhone.set(report.phone_id, new Map());
        }

        const category = report.report_category || "other";
        const categories = byPhone.get(report.phone_id)!;
        categories.set(category, (categories.get(category) || 0) + 1);
    }

    const result = new Map<string, { category: string; count: number }[]>();
    for (const [phoneId, categories] of byPhone) {
        result.set(phoneId,
            Array.from(categories.entries())
                .map(([category, count]) => ({ category, count }))
                .sort((a, b) => b.count - a.count)
        );
    }

    return result;
}

function calculateWeightAdjustments(
    feedback: FeedbackRow[],
    phoneScores: Map<string, PhoneScore>,
    currentWeights: Weights
): Weights {
    const upvotes = feedback.filter(f => f.feedback_type === "upvote");
    const reports = feedback.filter(f => f.feedback_type === "report");

    // Calculate upvote correlation with scores
    const upvotedPhones = upvotes
        .map(u => phoneScores.get(u.phone_id))
        .filter((p): p is PhoneScore => p !== undefined);

    if (upvotedPhones.length < 5) {
        console.log("⚠️ Insufficient upvote data for weight adjustment");
        return currentWeights;
    }

    // Calculate average scores of upvoted phones
    const avgScores = {
        Camera: avg(upvotedPhones.map(p => p.camera_score)),
        "Battery Endurance": avg(upvotedPhones.map(p => p.battery_score)),
        Performance: avg(upvotedPhones.map(p => p.performance_score)),
        "Software Experience": avg(upvotedPhones.map(p => p.software_score)),
        "Design & Build": avg(upvotedPhones.map(p => p.design_score)),
        Display: avg(upvotedPhones.map(p => p.display_score)),
        "Longevity Value": avg(upvotedPhones.map(p => p.longevity_score)),
    };

    // Adjust weights based on which attributes correlate with upvotes
    const totalAvg = Object.values(avgScores).reduce((a, b) => a + b, 0);
    const newWeights = { ...currentWeights };

    // Nudge weights towards attributes that perform well in upvoted phones
    // Using small learning rate to avoid drastic changes
    const learningRate = 0.05;

    for (const [attr, score] of Object.entries(avgScores)) {
        const key = attr as keyof typeof currentWeights.attributes;
        const normalized = score / totalAvg;
        const currentWeight = currentWeights.attributes[key];

        // Adjust weight slightly based on correlation
        newWeights.attributes[key] = Number(
            (currentWeight + learningRate * (normalized - currentWeight)).toFixed(3)
        );
    }

    // Normalize weights to sum to 1.0
    const weightSum = Object.values(newWeights.attributes).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(newWeights.attributes) as Array<keyof typeof newWeights.attributes>) {
        newWeights.attributes[key] = Number((newWeights.attributes[key] / weightSum).toFixed(3));
    }

    // Adjust regret multipliers based on report frequency
    const wrongScoreReports = reports.filter(r => r.report_category === "wrong_score").length;
    if (wrongScoreReports > 10) {
        // Increase regret sensitivity if many score complaints
        newWeights.regretMultipliers.highRegret = Math.min(1.5, newWeights.regretMultipliers.highRegret + 0.05);
    }

    newWeights.version = `v${Date.now()}`;
    newWeights.updatedAt = new Date().toISOString();

    return newWeights;
}

function updateRegretSentiments(
    reportAnalysis: Map<string, { category: string; count: number }[]>,
    currentRegret: RegretData
): RegretData {
    const updated = { ...currentRegret };
    updated.updatedAt = new Date().toISOString();

    for (const [phoneId, categories] of reportAnalysis) {
        const totalReports = categories.reduce((sum, c) => sum + c.count, 0);

        if (!updated.regretData[phoneId]) {
            updated.regretData[phoneId] = {
                phoneId,
                totalRegretScore: 0,
                attributes: {},
            };
        }

        // Increase regret score based on reports
        updated.regretData[phoneId].totalRegretScore = Math.min(
            10,
            (updated.regretData[phoneId].totalRegretScore || 0) + totalReports * 0.5
        );

        // Map report categories to attributes
        for (const { category, count } of categories) {
            const attrMap: Record<string, string> = {
                wrong_score: "Overall",
                wrong_spec: "Performance",
                outdated_info: "Software Experience",
                missing_info: "Other",
            };

            const attr = attrMap[category] || "Other";
            if (!updated.regretData[phoneId].attributes[attr]) {
                updated.regretData[phoneId].attributes[attr] = {
                    regretScore: 0,
                    frequency: "low",
                    topComplaints: [],
                };
            }

            updated.regretData[phoneId].attributes[attr].regretScore += count;
            updated.regretData[phoneId].attributes[attr].frequency =
                count > 10 ? "very_high" : count > 5 ? "high" : count > 2 ? "medium" : "low";
        }
    }

    return updated;
}

function avg(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + (b || 0), 0) / nums.length;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
    console.log("🔄 Truth Loop Analysis Starting...\n");
    console.log(`📅 Date: ${new Date().toISOString()}`);

    // Load current weights
    let currentWeights: Weights;
    try {
        const raw = await readFile(WEIGHTS_PATH, "utf-8");
        currentWeights = JSON.parse(raw);
        console.log(`📊 Loaded weights version: ${currentWeights.version}`);
    } catch {
        console.log("⚠️ No existing weights file, using defaults");
        currentWeights = {
            version: "v1",
            updatedAt: new Date().toISOString(),
            attributes: {
                Camera: 0.18,
                "Battery Endurance": 0.16,
                Performance: 0.14,
                "Software Experience": 0.14,
                "Design & Build": 0.12,
                Display: 0.14,
                "Longevity Value": 0.12,
            },
            regretMultipliers: {
                highRegret: 1.3,
                mediumRegret: 1.15,
                lowRegret: 1.0,
            },
        };
    }

    // Load current regret data
    let currentRegret: RegretData;
    try {
        const raw = await readFile(REGRET_PATH, "utf-8");
        currentRegret = JSON.parse(raw);
        console.log(`📊 Loaded regret data for ${Object.keys(currentRegret.regretData).length} phones`);
    } catch {
        console.log("⚠️ No existing regret file, using defaults");
        currentRegret = {
            regretData: {},
            updatedAt: new Date().toISOString(),
        };
    }

    // Fetch data
    console.log("\n📥 Fetching data...");
    const [feedback, phoneScores] = await Promise.all([
        fetchRecentFeedback(7),
        fetchPhoneScores(),
    ]);

    console.log(`   Feedback records: ${feedback.length}`);
    console.log(`   Phone scores: ${phoneScores.size}`);

    if (feedback.length === 0) {
        console.log("\n⚠️ No feedback in the last 7 days. Exiting.");
        return;
    }

    // Analyze
    console.log("\n🔍 Analyzing feedback...");
    const upvotes = feedback.filter(f => f.feedback_type === "upvote").length;
    const reports = feedback.filter(f => f.feedback_type === "report").length;
    console.log(`   Upvotes: ${upvotes}`);
    console.log(`   Reports: ${reports}`);

    const reportAnalysis = analyzeReports(feedback);
    console.log(`   Phones with reports: ${reportAnalysis.size}`);

    // Calculate adjustments
    console.log("\n⚙️ Calculating weight adjustments...");
    const newWeights = calculateWeightAdjustments(feedback, phoneScores, currentWeights);

    // Update regret sentiments
    console.log("⚙️ Updating regret sentiments...");
    const newRegret = updateRegretSentiments(reportAnalysis, currentRegret);

    // Save updates
    console.log("\n💾 Saving updates...");
    await writeFile(WEIGHTS_PATH, JSON.stringify(newWeights, null, 2));
    console.log(`   ✅ Saved weights to ${WEIGHTS_PATH}`);

    await writeFile(REGRET_PATH, JSON.stringify(newRegret, null, 2));
    console.log(`   ✅ Saved regret data to ${REGRET_PATH}`);

    // Summary
    console.log("\n=== Summary ===");
    console.log(`New weights version: ${newWeights.version}`);
    console.log("Attribute weights:");
    for (const [attr, weight] of Object.entries(newWeights.attributes)) {
        const oldWeight = currentWeights.attributes[attr as keyof typeof currentWeights.attributes];
        const delta = weight - oldWeight;
        const sign = delta >= 0 ? "+" : "";
        console.log(`   ${attr}: ${weight.toFixed(3)} (${sign}${delta.toFixed(3)})`);
    }

    console.log("\n✅ Truth Loop Analysis Complete!");
}

main().catch(err => {
    console.error("❌ Fatal error:", err);
    process.exit(1);
});
