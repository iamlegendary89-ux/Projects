// ORIGINAL: loadFailureCache
// Extracted by LZFOF v1.0.0

import fs from 'fs/promises';

export async function loadFailureCache(cachePath: string): Promise<Record<string, unknown>> {
  try {
    const data = await fs.readFile(cachePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}
