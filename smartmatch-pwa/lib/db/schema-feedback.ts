import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

// Feedback type enum
export const feedbackTypeEnum = pgEnum("feedback_type", ["upvote", "report"]);

// Report category enum
export const reportCategoryEnum = pgEnum("report_category", [
    "wrong_score",
    "wrong_spec",
    "outdated_info",
    "missing_info",
    "other"
]);

/**
 * Table for storing user feedback (upvotes and reports) on phone insights
 */
export const feedbacks = pgTable("feedbacks", {
    id: serial("id").primaryKey(),
    phoneId: text("phone_id").notNull(),
    feedbackType: feedbackTypeEnum("feedback_type").notNull(),
    reportCategory: reportCategoryEnum("report_category"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    userIp: text("user_ip"), // For rate limiting (hashed)
});

/**
 * Table for aggregating upvote counts per phone (for performance)
 */
export const upvoteCounts = pgTable("upvote_counts", {
    phoneId: text("phone_id").primaryKey(),
    count: integer("count").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;
export type UpvoteCount = typeof upvoteCounts.$inferSelect;
