/**
 * smartMatch Oracle v1.1 - Data Adapter
 * 
 * Converts enriched phone data format to CanonicalData format for smartMatch
 */

import type { CanonicalData } from "@/lib/canonical-types";

// LZFOF: Pre-compiled regex for phone ID generation
const WHITESPACE_RE = /\s+/g;

/**
 * Convert any phone data format to CanonicalData
 * Handles data from processed_content JSON files
 */
export function convertToCanonicalData(rawData: any): CanonicalData {
    // Handle the nested structure from processed_content files
    const data = rawData.data || rawData;

    return {
        phoneId: rawData.phoneId || data.phoneId || generatePhoneId(data),
        brand: extractBrand(rawData, data),
        model: extractModel(rawData, data),
        overallScore: data.overallScore || data.overall_score || 0,
        category: data.category || "unknown",
        onePageSummary: data.onePageSummary || data.summary || "",
        pros: data.pros || [],
        cons: data.cons || [],
        attributes: convertAttributes(data.attributes || {}),
        metadata: {
            confidence: rawData.confidence || data.metadata?.confidence || 0,
            modelUsed: data.metadata?.modelUsed || data.metadata?.model_used || "unknown",
            processingVersion: data.metadata?.processingVersion || "v2.0",
            processedAt: rawData.processedAt || data.metadata?.processedAt || new Date().toISOString(),
            processingTimeMs: data.metadata?.processingTimeMs || 0,
            sourceCount: data.metadata?.sourceCount || (rawData.sources?.length || 0),
            sourceNames: data.metadata?.sourceNames || extractSourceNames(rawData.sources || []),
            sourceUrls: data.metadata?.sourceUrls || extractSourceUrls(rawData.sources || []),
            batchMode: true
        }
    };
}

// LZFOF: Reuse pre-compiled WHITESPACE_RE
function generatePhoneId(data: any): string {
    const brand = (data.brand || "unknown").toLowerCase().replace(WHITESPACE_RE, "_");
    const model = (data.model || "unknown").toLowerCase().replace(WHITESPACE_RE, "_");
    return `${brand}_${model}`;
}

function extractBrand(rawData: any, data: any): string {
    return rawData.brand || data.brand || "Unknown";
}

function extractModel(rawData: any, data: any): string {
    return rawData.model || data.model || "Unknown Model";
}

// LZFOF: Replaced Object.entries().forEach with for...in for less overhead
function convertAttributes(attrs: any): Record<string, { score: number; explanation: string }> {
    if (!attrs || typeof attrs !== "object") return {};

    const converted: Record<string, { score: number; explanation: string }> = {};
    for (const key in attrs) {
        const value = attrs[key];
        if (value && typeof value === "object" && "score" in value) {
            converted[key] = {
                score: value.score || 0,
                explanation: value.explanation || ""
            };
        }
    }
    return converted;
}

function extractSourceNames(sources: any[]): string[] {
    if (!Array.isArray(sources)) return [];

    return sources
        .filter(s => typeof s === "string")
        .map(s => s);
}

function extractSourceUrls(sources: any[]): string[] {
    if (!Array.isArray(sources)) return [];

    // Filter for URLs (starts with http)
    return sources
        .filter(s => typeof s === "string" && s.startsWith("http"))
        .map(s => s);
}

/**
 * Convert array of raw phone data to CanonicalData array
 */
export function convertPhoneArrayToCanonical(phones: any[]): CanonicalData[] {
    return phones.map(phone => convertToCanonicalData(phone));
}
