// VARIANT 5: Ternary chain - most compact
// Single expression with ternary

interface FailureCacheEntry {
    doNotRetry?: boolean;
    nextRetry: string;
}
type FailureCache = Record<string, FailureCacheEntry>;

export function shouldSkipUrl(cache: FailureCache, url: string): boolean {
    const e = cache[url];
    return !e ? false : e.doNotRetry ? true : new Date(e.nextRetry).getTime() > Date.now();
}
