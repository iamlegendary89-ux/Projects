// VARIANT 4: Cached Date.now() for multiple checks
// Micro-optimization

interface FailureCacheEntry {
    doNotRetry?: boolean;
    nextRetry: string;
}
type FailureCache = Record<string, FailureCacheEntry>;

const now = () => Date.now();

export function shouldSkipUrl(cache: FailureCache, url: string): boolean {
    const entry = cache[url];
    if (!entry) return false;
    return entry.doNotRetry === true || +new Date(entry.nextRetry) > now();
}
