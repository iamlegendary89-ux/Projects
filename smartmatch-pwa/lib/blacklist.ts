#!/usr/bin/env node
/**
 * SmartMatch AI - Blacklist Utilities
 * URL/domain blacklisting and management for data quality control
 */

import path from "path";
import { safeReadJson, safeWriteJson } from "./io";
import { createCanonicalId } from "./ids";

/**
 * Blacklist settings configuration
 */
interface BlacklistSettings {
  max_entries: number;
  cleanup_threshold: number;
  auto_cleanup_days: number;
  enable_auto_detection: boolean;
  enable_pattern_learning: boolean;
}

/**
 * Individual blacklist entry
 */
interface BlacklistEntry {
  id: string;
  url: string;
  domain: string;
  pattern: string | null;
  reason: string;
  category: string;
  added_by: string;
  added_at: string;
  confidence: number;
  hit_count: number;
  last_hit: string | null;
  metadata: Record<string, any>;
}

/**
 * Blacklist source categories
 */
interface BlacklistSources {
  manual: string[];
  auto_detected: string[];
  pattern_based: string[];
  [key: string]: string[];
}

/**
 * Main blacklist object structure
 */
interface BlacklistObject {
  version: string;
  created_at: string;
  updated_at: string;
  last_cleanup: string | null;
  entries: BlacklistEntry[];
  sources: BlacklistSources;
  settings: BlacklistSettings;
  total_entries: number;
}

/**
 * Blacklist check result
 */
interface BlacklistCheckResult {
  blacklisted: boolean;
  reason?: string;
  category?: string;
  added_by?: string;
  added_at?: string;
  confidence?: number;
  match_type?: "domain" | "pattern";
}

/**
 * Add to blacklist options
 */
interface AddBlacklistOptions {
  category?: string;
  added_by?: string;
  confidence?: number;
  pattern?: string | null;
  filePath?: string | null;
}

/**
 * Add to blacklist result
 */
interface AddBlacklistResult {
  success: boolean;
  reason?: string;
  existing_entry?: BlacklistCheckResult;
  entry?: BlacklistEntry;
  total_entries?: number;
}

/**
 * Remove from blacklist result
 */
interface RemoveBlacklistResult {
  success: boolean;
  reason?: string;
  removed_count?: number;
  total_entries?: number;
}

/**
 * Blacklist statistics
 */
interface BlacklistStats {
  total_entries: number;
  categories: Record<string, number>;
  sources: Record<string, number>;
  recent_additions: Array<{
    url: string;
    category: string;
    added_at: string;
    reason: string;
  }>;
  top_hit_entries: Array<{
    url: string;
    hit_count: number;
    last_hit: string | null;
  }>;
  avg_confidence: number;
  cleanup_needed: boolean;
}

/**
 * Auto-detect blacklist results
 */
interface AutoDetectResult {
  analyzed: number;
  blacklisted: number;
  errors: Record<string, string[]>;
  patterns_detected: Record<string, number>;
}

/**
 * Cleanup results
 */
interface CleanupResult {
  original_count: number;
  remaining_count: number;
  removed_count: number;
}

/**
 * Default blacklist configuration
 */
const DEFAULT_BLACKLIST_CONFIG: Omit<BlacklistObject, "total_entries" | "updated_at" | "last_cleanup"> = {
  version: "1.0",
  created_at: new Date().toISOString(),
  entries: [],
  sources: {
    manual: [],
    auto_detected: [],
    pattern_based: [],
  },
  settings: {
    max_entries: 10000,
    cleanup_threshold: 5000,
    auto_cleanup_days: 30,
    enable_auto_detection: true,
    enable_pattern_learning: true,
  },
};

/**
 * Load blacklist from file
 * @param filePath - Path to blacklist file (default: data/blacklist/urls.json)
 * @returns Promise<BlacklistObject> Blacklist object
 */
export async function loadBlacklist(filePath: string | null = null): Promise<BlacklistObject> {
  const defaultPath = path.join(process.cwd(), "data", "blacklist", "urls.json");
  const blacklistPath = filePath || defaultPath;

  const blacklist = await safeReadJson(blacklistPath, DEFAULT_BLACKLIST_CONFIG);

  // Ensure blacklist has required structure
  return ensureBlacklistStructure(blacklist);
}

/**
 * Check if URL is blacklisted
 * @param url - URL to check
 * @param blacklist - Blacklist object (optional, will load if not provided)
 * @returns Promise<BlacklistCheckResult> Check result with details
 */
export async function isBlacklisted(
  url: string,
  blacklist: BlacklistObject | null = null,
): Promise<BlacklistCheckResult> {
  if (!url) {
    return { blacklisted: false, reason: "Empty URL" };
  }

  const bl = blacklist || (await loadBlacklist());
  const normalizedUrl = normalizeUrl(url);

  // Check exact URL matches
  for (const entry of bl.entries) {
    if (entry.url === normalizedUrl || entry.url === url) {
      return {
        blacklisted: true,
        reason: entry.reason,
        category: entry.category,
        added_by: entry.added_by,
        added_at: entry.added_at,
        confidence: entry.confidence || 1.0,
      };
    }
  }

  // Check domain matches
  const domain = extractDomain(url);
  for (const entry of bl.entries) {
    if (entry.domain === domain) {
      return {
        blacklisted: true,
        reason: entry.reason,
        category: entry.category,
        added_by: entry.added_by,
        added_at: entry.added_at,
        confidence: entry.confidence || 1.0,
        match_type: "domain",
      };
    }
  }

  // Check pattern matches
  for (const entry of bl.entries) {
    if (entry.pattern && testPattern(url, entry.pattern)) {
      return {
        blacklisted: true,
        reason: entry.reason,
        category: entry.category,
        added_by: entry.added_by,
        added_at: entry.added_at,
        confidence: entry.confidence || 0.8,
        match_type: "pattern",
      };
    }
  }

  return { blacklisted: false };
}

/**
 * Add URL to blacklist
 * @param url - URL to blacklist
 * @param reason - Reason for blacklisting
 * @param options - Additional options
 * @returns Promise<AddBlacklistResult> Result of operation
 */
export async function addToBlacklist(
  url: string,
  reason: string,
  options: AddBlacklistOptions = {},
): Promise<AddBlacklistResult> {
  const {
    category = "manual",
    added_by = "system",
    confidence = 1.0,
    pattern = null,
    filePath: customFilePath = null,
  } = options;

  if (!url || !reason) {
    throw new Error("URL and reason are required");
  }

  const defaultPath = path.join(process.cwd(), "data", "blacklist", "urls.json");
  const bl = await loadBlacklist(customFilePath);
  const normalizedUrl = normalizeUrl(url);
  const domain = extractDomain(url);

  // Check if already blacklisted
  const existing = await isBlacklisted(url, bl);
  if (existing.blacklisted) {
    return {
      success: false,
      reason: "Already blacklisted",
      existing_entry: existing,
    };
  }

  // Create new entry
  const entry: BlacklistEntry = {
    id: createCanonicalId(`${url}_${Date.now()}`, "smartmatch-blacklist"),
    url: normalizedUrl,
    domain,
    pattern,
    reason,
    category,
    added_by,
    added_at: new Date().toISOString(),
    confidence,
    hit_count: 0,
    last_hit: null,
    metadata: {},
  };

  // Add to entries
  bl.entries.push(entry);

  // Add to appropriate source list
  if (!bl.sources[category]) {
    bl.sources[category] = [];
  }
  bl.sources[category].push(entry.id);

  // Update metadata
  bl.updated_at = new Date().toISOString();
  bl.total_entries = bl.entries.length;

  // Cleanup if too many entries
  if (bl.entries.length > bl.settings.max_entries) {
    await cleanupBlacklist(bl, customFilePath || null);
  }

  // Save updated blacklist
  const savePath = customFilePath || defaultPath;
  await safeWriteJson(savePath, bl);

  return {
    success: true,
    entry,
    total_entries: bl.entries.length,
  };
}

/**
 * Remove URL from blacklist
 * @param url - URL to remove
 * @param filePath - Custom blacklist file path
 * @returns Promise<RemoveBlacklistResult> Result of operation
 */
export async function removeFromBlacklist(url: string, filePath: string | null = null): Promise<RemoveBlacklistResult> {
  const bl = await loadBlacklist(filePath);
  const normalizedUrl = normalizeUrl(url);
  const domain = extractDomain(url);

  // Find matching entries
  const indicesToRemove: number[] = [];
  for (let i = 0; i < bl.entries.length; i++) {
    const entry = bl.entries[i];
    if (!entry) continue;
    if (entry.url === normalizedUrl || entry.url === url || entry.domain === domain) {
      indicesToRemove.push(i);
    }
  }

  if (indicesToRemove.length === 0) {
    return {
      success: false,
      reason: "URL not found in blacklist",
    };
  }

  // Remove entries (from end to beginning to maintain indices)
  indicesToRemove.reverse().forEach((index) => {
    const removed = bl.entries.splice(index, 1)[0];
    if (!removed) return;

    // Remove from source lists
    Object.values(bl.sources).forEach((sourceList) => {
      const entryIndex = sourceList.indexOf(removed.id);
      if (entryIndex > -1) {
        sourceList.splice(entryIndex, 1);
      }
    });
  });

  // Update metadata
  bl.updated_at = new Date().toISOString();
  bl.total_entries = bl.entries.length;

  // Save updated blacklist
  const defaultPath = path.join(process.cwd(), "data", "blacklist", "urls.json");
  const savePath = filePath || defaultPath;
  await safeWriteJson(savePath, bl);

  return {
    success: true,
    removed_count: indicesToRemove.length,
    total_entries: bl.entries.length,
  };
}

/**
 * Get blacklist statistics
 * @param filePath - Custom blacklist file path
 * @returns Promise<BlacklistStats> Blacklist statistics
 */
export async function getBlacklistStats(filePath: string | null = null): Promise<BlacklistStats> {
  const bl = await loadBlacklist(filePath);

  const stats: BlacklistStats = {
    total_entries: bl.entries.length,
    categories: {},
    sources: {},
    recent_additions: [],
    top_hit_entries: [],
    avg_confidence: 0,
    cleanup_needed: bl.entries.length > bl.settings.cleanup_threshold,
  };

  // Calculate category statistics
  bl.entries.forEach((entry) => {
    stats.categories[entry.category] = (stats.categories[entry.category] || 0) + 1;

    if (entry.hit_count > 0) {
      stats.top_hit_entries.push({
        url: entry.url,
        hit_count: entry.hit_count,
        last_hit: entry.last_hit,
      });
    }
  });

  // Calculate source statistics
  Object.entries(bl.sources).forEach(([source, entries]) => {
    stats.sources[source] = entries.length;
  });

  // Recent additions (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  stats.recent_additions = bl.entries
    .filter((entry) => new Date(entry.added_at) > sevenDaysAgo)
    .map((entry) => ({
      url: entry.url,
      category: entry.category,
      added_at: entry.added_at,
      reason: entry.reason,
    }))
    .sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());

  // Top hit entries
  stats.top_hit_entries.sort((a, b) => b.hit_count - a.hit_count);
  stats.top_hit_entries = stats.top_hit_entries.slice(0, 10);

  // Average confidence
  if (bl.entries.length > 0) {
    stats.avg_confidence = bl.entries.reduce((sum, entry) => sum + (entry.confidence || 1), 0) / bl.entries.length;
  }

  return stats;
}

/**
 * Auto-detect and blacklist problematic URLs
 * @param urls - URLs to analyze
 * @param options - Detection options
 * @returns Promise<AutoDetectResult> Detection results
 */
export async function autoDetectBlacklist(
  urls: string[],
  options: {
    minErrors?: number;
    minErrorRate?: number;
    patterns?: string[];
    filePath?: string | null;
  } = {},
): Promise<AutoDetectResult> {
  const {
    minErrors = 3,
    minErrorRate = 0.5,
    patterns = ["error", "404", "timeout", "blocked"],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filePath: _filePath = null,
  } = options;

  const results: AutoDetectResult = {
    analyzed: urls.length,
    blacklisted: 0,
    errors: {},
    patterns_detected: {},
  };

  // Analyze URLs for patterns
  for (const url of urls) {
    const issues = analyzeUrl(url, patterns);

    if (issues.length > 0) {
      issues.forEach((issue) => {
        if (!results.errors[issue]) {
          results.errors[issue] = [];
        }
        results.errors[issue].push(url);

        if (!results.patterns_detected[issue]) {
          results.patterns_detected[issue] = 0;
        }
        results.patterns_detected[issue]++;
      });
    }
  }

  // Blacklist URLs that meet criteria
  for (const [pattern, urlsWithPattern] of Object.entries(results.errors)) {
    if (urlsWithPattern.length >= minErrors) {
      const errorRate = urlsWithPattern.length / results.analyzed;

      if (errorRate >= minErrorRate) {
        for (const url of urlsWithPattern.slice(0, 5)) {
          // Limit to prevent over-blacklisting
          try {
            await addToBlacklist(url, `Auto-detected: ${pattern}`, {
              category: "auto_detected",
              added_by: "auto_detector",
              confidence: Math.min(errorRate, 0.9),
            });
            results.blacklisted++;
          } catch {
            // Failed to auto-blacklist URL, continue processing
          }
        }
      }
    }
  }

  return results;
}

/**
 * Clean up old blacklist entries
 * @param blacklist - Blacklist object
 * @param filePath - File path for saving
 * @returns Promise<CleanupResult> Cleanup results
 */
async function cleanupBlacklist(blacklist: BlacklistObject, filePath: string | null = null): Promise<CleanupResult> {
  const cutoffDate = new Date(Date.now() - blacklist.settings.auto_cleanup_days * 24 * 60 * 60 * 1000);
  const originalCount = blacklist.entries.length;

  // Remove old entries with low hit counts
  blacklist.entries = blacklist.entries.filter((entry) => {
    const entryDate = new Date(entry.added_at);
    const isRecent = entryDate > cutoffDate;
    const hasHits = entry.hit_count > 0;
    const isHighConfidence = (entry.confidence || 1) >= 0.8;

    // Keep if: recent OR has hits OR high confidence
    return isRecent || hasHits || isHighConfidence;
  });

  // Update source lists
  Object.keys(blacklist.sources).forEach((source) => {
    const sourceList = blacklist.sources[source];
    if (sourceList) {
      blacklist.sources[source] = sourceList.filter((id) =>
        blacklist.entries.some((entry) => entry.id === id),
      );
    }
  });

  // Update metadata
  blacklist.updated_at = new Date().toISOString();
  blacklist.total_entries = blacklist.entries.length;
  blacklist.last_cleanup = new Date().toISOString();

  const removedCount = originalCount - blacklist.entries.length;

  // Save if file path provided
  if (filePath) {
    const defaultPath = path.join(process.cwd(), "data", "blacklist", "urls.json");
    const savePath = filePath || defaultPath;
    await safeWriteJson(savePath, blacklist);
  }

  return {
    original_count: originalCount,
    remaining_count: blacklist.entries.length,
    removed_count: removedCount,
  };
}

/**
 * Ensure blacklist has proper structure
 * @param blacklist - Blacklist object
 * @returns BlacklistObject Properly structured blacklist
 */
function ensureBlacklistStructure(blacklist: any): BlacklistObject {
  const structured: BlacklistObject = {
    version: blacklist.version || "1.0",
    created_at: blacklist.created_at || new Date().toISOString(),
    updated_at: blacklist.updated_at || new Date().toISOString(),
    entries: blacklist.entries || [],
    sources: blacklist.sources || { manual: [], auto_detected: [], pattern_based: [] },
    settings: { ...DEFAULT_BLACKLIST_CONFIG.settings, ...blacklist.settings },
    total_entries: 0,
    last_cleanup: blacklist.last_cleanup || null,
  };

  structured.total_entries = structured.entries.length;

  return structured;
}

/**
 * Normalize URL for consistent comparison
 * @param url - URL to normalize
 * @returns string Normalized URL
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    return urlObj.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Extract domain from URL
 * @param url - URL to extract domain from
 * @returns string Domain
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    // Fallback for invalid URLs
    return url
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.replace(/^www\./, "") || "";
  }
}

/**
 * Test if URL matches pattern
 * @param url - URL to test
 * @param pattern - Pattern to match
 * @returns boolean True if matches
 */
function testPattern(url: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern, "i");
    return regex.test(url);
  } catch {
    // Invalid regex pattern
    return false;
  }
}

/**
 * Analyze URL for potential issues
 * @param url - URL to analyze
 * @param patterns - Patterns to look for
 * @returns string[] Issues found
 */
function analyzeUrl(url: string, patterns: string[]): string[] {
  const issues: string[] = [];
  const urlLower = url.toLowerCase();

  for (const pattern of patterns) {
    if (urlLower.includes(pattern)) {
      issues.push(pattern);
    }
  }

  // Additional heuristics
  if (urlLower.includes("sample") || urlLower.includes("demo") || urlLower.includes("test")) {
    issues.push("sample_content");
  }

  if (urlLower.includes("thumb") || urlLower.includes("preview") || urlLower.includes("small")) {
    issues.push("thumbnail");
  }

  if (urlLower.includes("camera") || urlLower.includes("gallery") || urlLower.includes("photos")) {
    issues.push("media_content");
  }

  return issues;
}
