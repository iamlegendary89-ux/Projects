// ORIGINAL: function

function shouldSkipUrl(cache: FailureCache, url: string): boolean {
  const entry = cache[url];
  if (!entry) { return false; }
  if (entry.doNotRetry) { return true; }
  return new Date(entry.nextRetry).getTime() > Date.now();
}
