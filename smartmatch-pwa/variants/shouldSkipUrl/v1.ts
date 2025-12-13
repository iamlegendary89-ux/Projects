// VARIANT 1: Single return with logical AND/OR
// Reduces to one statement

interface FailureCacheEntry {
    doNotRetry?: boolean;
    nextRetry: string;
}
type FailureCache = Record<string, FailureCacheEntry>;

export function shouldSkipUrl(cache: FailureCache, url: string): boolean {
    const entry = cache[url];
    return !!entry && (entry.doNotRetry || new Date(entry.nextRetry).getTime() > Date.now());
}
