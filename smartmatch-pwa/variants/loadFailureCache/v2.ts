// VARIANT 2: Sync with existsSync guard
// Avoids try/catch overhead

import fs from 'fs';

export function loadFailureCache(cacheFile: string): Record<string, unknown> {
    if (!fs.existsSync(cacheFile)) return {};
    try {
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    } catch {
        return {};
    }
}
