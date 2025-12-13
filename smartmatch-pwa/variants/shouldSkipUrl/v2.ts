// VARIANT 2: Optional chaining with nullish coalescing
// Modern JS approach

interface FailureCacheEntry {
    doNotRetry?: boolean;
    nextRetry: string;
}
type FailureCache = Record<string, FailureCacheEntry>;

export function shouldSkipUrl(cache: FailureCache, url: string): boolean {
    const entry = cache[url];
    return entry?.doNotRetry ?? (entry ? new Date(entry.nextRetry).getTime() > Date.now() : false);
}
