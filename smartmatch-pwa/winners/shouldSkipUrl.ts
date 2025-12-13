// VARIANT 3: Early returns with guard clauses
// Most readable, explicit flow

interface FailureCacheEntry {
    doNotRetry?: boolean;
    nextRetry: string;
}
type FailureCache = Record<string, FailureCacheEntry>;

export function shouldSkipUrl(cache: FailureCache, url: string): boolean {
    const entry = cache[url];
    if (!entry) return false;
    if (entry.doNotRetry) return true;
    return new Date(entry.nextRetry).getTime() > Date.now();
}
