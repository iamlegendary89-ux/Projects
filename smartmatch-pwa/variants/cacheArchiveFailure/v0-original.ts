// ORIGINAL: cacheArchiveFailure
// Extracted by LZFOF v1.0.0

interface FailureCacheEntry {
  retryCount: number;
  nextRetry: string;
  doNotRetry?: boolean;
  failureReason?: string;
}
type FailureCache = Record<string, FailureCacheEntry>;

const BACKOFF_HOURS = [1, 6, 24, 168, 720];

export function cacheArchiveFailure(
  cacheInput: FailureCache,
  url: string,
  doNotRetry = false,
  failureReason?: string | null,
  now?: string | Date | null
): FailureCacheEntry {
  // Deep clone to avoid mutation across benchmark iterations
  const cache = JSON.parse(JSON.stringify(cacheInput)) as FailureCache;
  const timestamp = now ? (typeof now === 'string' ? new Date(now) : now) : new Date();
  const existing = cache[url];
  const failureCount = existing ? existing.retryCount + 1 : 1;

  const backoffHours = BACKOFF_HOURS[Math.min(failureCount - 1, 4)] || 1;
  const nextRetry = new Date(timestamp.getTime() + backoffHours * 3600000);

  const cacheEntry: FailureCacheEntry = {
    retryCount: failureCount,
    nextRetry: nextRetry.toISOString(),
  };

  if (doNotRetry || existing?.doNotRetry) {
    cacheEntry.doNotRetry = true;
  }
  if (failureReason || existing?.failureReason) {
    cacheEntry.failureReason = failureReason || existing?.failureReason;
  }

  return cacheEntry;
}
