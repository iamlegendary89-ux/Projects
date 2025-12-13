// VARIANT 3: Using require with fallback
// Most compact

export function loadFailureCache(cacheFile: string): Record<string, unknown> {
    try { return require(cacheFile); } catch { return {}; }
}
