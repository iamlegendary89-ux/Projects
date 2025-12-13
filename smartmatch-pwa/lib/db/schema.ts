// Drop existing tables before recreating (for migration purposes)
export const DROP_STATEMENTS = `
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS processing_metadata;
DROP TABLE IF EXISTS processed_phones;
DROP TABLE IF EXISTS dynamic_phones;
DROP TABLE IF EXISTS phones;
`;

import { pgTable, serial, text, integer, jsonb, timestamp, numeric } from 'drizzle-orm/pg-core';

// Phones Table: The core product data
export const phones = pgTable('phones', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    price: integer('price'), // Current lowest price in cents or base currency unit
    releaseDate: timestamp('release_date'),
    imageUrl: text('image_url'),

    // Specs stored as structured JSON for flexibility
    specs: jsonb('specs').notNull().default({}),

    // AI-generated summary/highlights
    aiSummary: text('ai_summary'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Processed Phones Table: Flat schema with individual columns (new structure)
export const processedPhones = pgTable('processed_phones', {
    id: serial('id').primaryKey(),
    phone_id: text('phone_id').notNull().unique(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    release_date: timestamp('release_date'),
    overall_score: numeric('overall_score', { precision: 4, scale: 2 }), // 0-10 score with decimals
    category: text('category'), // "flagship", "premium", "upper_midrange", etc.

    // Main summary in separate column
    summary: text('summary'), // onePageSummary content

    // Pros and cons as text (JSON arrays flattened to readable text)
    pros: text('pros'), // Array items joined with line breaks
    cons: text('cons'), // Array items joined with line breaks

    // Individual attribute scores (flattened from nested structure)
    camera_score: numeric('camera_score', { precision: 4, scale: 2 }), // Decimal scores like 5.55
    battery_score: numeric('battery_score', { precision: 4, scale: 2 }), // 0-10 with decimal precision
    performance_score: numeric('performance_score', { precision: 4, scale: 2 }),
    display_score: numeric('display_score', { precision: 4, scale: 2 }),
    software_score: numeric('software_score', { precision: 4, scale: 2 }),
    design_score: numeric('design_score', { precision: 4, scale: 2 }),
    longevity_score: numeric('longevity_score', { precision: 4, scale: 2 }),

    // Camera details
    camera_main: text('camera_main'), // Main camera setup description
    camera_telephoto: text('camera_telephoto'), // Telephoto capabilities
    camera_video: text('camera_video'), // Video recording features

    // Processing metadata
    last_processed_at: timestamp('last_processed_at').notNull(),
    enrichment_status: text('enrichment_status').notNull(), // "completed", "failed", "pending"
    facts_version: text('facts_version').notNull(),
    confidence: integer('confidence'), // AI confidence percentage
    processing_time_ms: integer('processing_time_ms'), // How long it took to process

    // Full data backup (for potential rollback)
    full_data: jsonb('full_data'), // Unchanged enhanced data as backup

    // Metadata
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

// Dynamic Phones Table: Post-OSET processed data with dynamic attributes
export const dynamicPhones = pgTable('dynamic_phones', {
    id: serial('id').primaryKey(),
    phone_id: text('phone_id').notNull().unique(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    release_date: timestamp('release_date'),
    overall_score: numeric('overall_score', { precision: 4, scale: 2 }), // 0-10 score with decimals
    category: text('category'), // "flagship", "premium", "upper_midrange", etc.

    // Main summary in separate column
    summary: text('summary'), // onePageSummary content

    // Pros and cons as text (JSON arrays flattened to readable text)
    pros: text('pros'), // Array items joined with line breaks
    cons: text('cons'), // Array items joined with line breaks

    // Individual attribute scores (flattened from nested structure)
    camera_score: numeric('camera_score', { precision: 4, scale: 2 }), // Decimal scores like 5.55
    battery_score: numeric('battery_score', { precision: 4, scale: 2 }), // 0-10 with decimal precision
    performance_score: numeric('performance_score', { precision: 4, scale: 2 }),
    display_score: numeric('display_score', { precision: 4, scale: 2 }),
    software_score: numeric('software_score', { precision: 4, scale: 2 }),
    design_score: numeric('design_score', { precision: 4, scale: 2 }),
    longevity_score: numeric('longevity_score', { precision: 4, scale: 2 }),

    // Camera details
    camera_main: text('camera_main'), // Main camera setup description
    camera_telephoto: text('camera_telephoto'), // Telephoto capabilities
    camera_video: text('camera_video'), // Video recording features

    // Processing metadata
    last_processed_at: timestamp('last_processed_at').notNull(),
    enrichment_status: text('enrichment_status').notNull(), // "completed", "failed", "pending"
    facts_version: text('facts_version').notNull(),
    confidence: integer('confidence'), // AI confidence percentage
    processing_time_ms: integer('processing_time_ms'), // How long it took to process

    // Full data backup (for potential rollback)
    full_data: jsonb('full_data'), // Unchanged enhanced data as backup

    // Metadata
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

// Processing Metadata Table: Performance tracking (used by sync.ts)
export const processingMetadata = pgTable('processing_metadata', {
    id: serial('id').primaryKey(),
    total_processed_phones: integer('total_processed_phones').default(0),
    last_updated: timestamp('last_updated').notNull(),
    avg_processing_time: integer('avg_processing_time'),
    total_deepseek_calls: integer('total_deepseek_calls'),
    avg_confidence: integer('avg_confidence'), // As percentage (0-100)
    created_at: timestamp('created_at').defaultNow(),
});

// Reviews Table: Aggregated reviews from the web
export const reviews = pgTable('reviews', {
    id: serial('id').primaryKey(),
    phoneId: integer('phone_id').references(() => phones.id),
    source: text('source').notNull(), // e.g., "The Verge", "MKBHD"
    url: text('url').notNull(),
    author: text('author'),
    rating: integer('rating'), // Normalized 0-100
    summary: text('summary'),
    sentiment: text('sentiment'), // "positive", "neutral", "negative"
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Embeddings Table: For RAG (Vector Search)
// Note: Requires 'vector' extension in Postgres (Supabase has this)
/*
export const embeddings = pgTable('embeddings', {
    id: serial('id').primaryKey(),
    phoneId: integer('phone_id').references(() => phones.id),
    content: text('content').notNull(), // The text chunk that was embedded
    embedding: vector('embedding', { dimensions: 768 }), // 768 is standard for many models (e.g. Gemini/OpenAI)
    metadata: jsonb('metadata'), // Extra context
    createdAt: timestamp('created_at').defaultNow(),
});
*/
