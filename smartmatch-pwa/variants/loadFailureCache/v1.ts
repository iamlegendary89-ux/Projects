// VARIANT 1: Nullish coalescing with catch return
// Single expression with error fallback

import fs from 'fs/promises';

export async function loadFailureCache(cacheFile: string): Promise<Record<string, unknown>> {
    return fs.readFile(cacheFile, 'utf8')
        .then(data => JSON.parse(data))
        .catch(() => ({}));
}
