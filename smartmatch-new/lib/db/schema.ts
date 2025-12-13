import {
    pgTable,
    text,
    timestamp,
    decimal,
    jsonb,
    serial,
    integer,
    date,
} from "drizzle-orm/pg-core";

// =============================================================================
// DUAL-STATE DATABASE SCHEMA (Sacred Rule #3)
// =============================================================================
// processed_phones: Raw enrichment scores (original, pre-OSET)
// dynamic_phones:   Post-OSET scores (time-decayed, used for UI)
// =============================================================================

/**
 * PROCESSED_PHONES — Raw Enrichment Scores
 * 
 * Contains original scores from enrichment pipeline BEFORE OSET is applied.
 * Used for historical reference and re-running OSET with different parameters.
 */
export const processedPhones = pgTable("processed_phones", {
    id: text("id").primaryKey(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    releaseDate: date("release_date"),

    // Original 7-attribute scores (Sacred Rule #6)
    cameraScore: decimal("camera_score", { precision: 4, scale: 2 }),
    batteryScore: decimal("battery_score", { precision: 4, scale: 2 }),
    performanceScore: decimal("performance_score", { precision: 4, scale: 2 }),
    softwareScore: decimal("software_score", { precision: 4, scale: 2 }),
    designScore: decimal("design_score", { precision: 4, scale: 2 }),
    displayScore: decimal("display_score", { precision: 4, scale: 2 }),
    longevityScore: decimal("longevity_score", { precision: 4, scale: 2 }),
    overallScore: decimal("overall_score", { precision: 4, scale: 2 }),

    // Content
    pros: jsonb("pros").$type<string[]>(),
    cons: jsonb("cons").$type<string[]>(),
    summary: text("summary"),

    // Sacred Rule #4: full_data JSONB keeps everything
    fullData: jsonb("full_data").notNull(),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * DYNAMIC_PHONES — Post-OSET Scores
 * 
 * Contains time-decayed scores after OSET algorithm is applied.
 * This is what the UI reads for rankings and recommendations.
 */
export const dynamicPhones = pgTable("dynamic_phones", {
    id: text("id").primaryKey(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    releaseDate: date("release_date"),

    // OSET-adjusted 7-attribute scores (these decay over time)
    cameraScore: decimal("camera_score", { precision: 4, scale: 2 }),
    batteryScore: decimal("battery_score", { precision: 4, scale: 2 }),
    performanceScore: decimal("performance_score", { precision: 4, scale: 2 }),
    softwareScore: decimal("software_score", { precision: 4, scale: 2 }),
    designScore: decimal("design_score", { precision: 4, scale: 2 }),
    displayScore: decimal("display_score", { precision: 4, scale: 2 }),
    longevityScore: decimal("longevity_score", { precision: 4, scale: 2 }),
    overallScore: decimal("overall_score", { precision: 4, scale: 2 }),

    // Content
    pros: jsonb("pros").$type<string[]>(),
    cons: jsonb("cons").$type<string[]>(),
    summary: text("summary"),

    // Sacred Rule #4: full_data JSONB keeps everything
    fullData: jsonb("full_data").notNull(),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * FEEDBACK — User feedback on phone recommendations
 */
export const feedback = pgTable("feedback", {
    id: serial("id").primaryKey(),
    phoneId: text("phone_id"),
    feedbackType: text("feedback_type"), // 'upvote' | 'downvote' | 'report'
    reportCategory: text("report_category"),
    description: text("description"),
    userIp: text("user_ip"),
    createdAt: timestamp("created_at").defaultNow(),
});

/**
 * UPVOTE_COUNTS — Aggregated upvote counts per phone
 */
export const upvoteCounts = pgTable("upvote_counts", {
    phoneId: text("phone_id").primaryKey(),
    count: integer("count").default(0),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ProcessedPhone = typeof processedPhones.$inferSelect;
export type DynamicPhone = typeof dynamicPhones.$inferSelect;
export type NewProcessedPhone = typeof processedPhones.$inferInsert;
export type NewDynamicPhone = typeof dynamicPhones.$inferInsert;
