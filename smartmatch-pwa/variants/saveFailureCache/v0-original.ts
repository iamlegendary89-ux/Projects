// ORIGINAL: saveFailureCache
// Extracted by LZFOF v1.0.0

import fs from 'fs/promises';

export async function saveFailureCache(cache: Record<string, unknown>, cachePath: string): Promise<boolean> {
  try {
    const tmpPath = `${cachePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(cache, null, 2), 'utf8');
    await fs.rename(tmpPath, cachePath);
    return true;
  } catch {
    return false;
  }
}
