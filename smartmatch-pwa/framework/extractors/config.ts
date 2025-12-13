/**
 * LZFOF 2.0 - Config Extractor
 */

import fs from 'fs';
import path from 'path';
import type { ExtractedItem, Extractor } from '../types.js';

export const configExtractor: Extractor = {
    type: 'config',

    extract(filePath: string): ExtractedItem[] {
        const items: ExtractedItem[] = [];
        const content = fs.readFileSync(filePath, 'utf8');

        // JSON files - extract top-level objects
        if (filePath.endsWith('.json')) {
            try {
                const obj = JSON.parse(content);
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'object' && value !== null) {
                        items.push({
                            name: key,
                            type: 'config',
                            code: JSON.stringify(value, null, 2),
                            start: 0,
                            end: content.length,
                            file: filePath,
                            metadata: { keys: Object.keys(value as object).length },
                        });
                    }
                }
            } catch { /* ignore parse errors */ }
        }

        // TS/JS files - find CONFIG objects and threshold constants
        if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
            const configPatterns = [
                /(?:const|let)\s+(CONFIG|THRESHOLDS?|SETTINGS?|OPTIONS?)\s*(?::\s*[^=]+)?\s*=\s*(\{[\s\S]*?\n\})/g,
                /(?:const|let)\s+(\w*[Cc]onfig\w*|\w*[Tt]hreshold\w*)\s*(?::\s*[^=]+)?\s*=\s*(\{[\s\S]*?\n\})/g,
            ];

            for (const pattern of configPatterns) {
                pattern.lastIndex = 0;
                let match: RegExpExecArray | null;

                while ((match = pattern.exec(content)) !== null) {
                    const name = match[1];
                    const code = match[2];
                    if (!name || !code) continue;

                    items.push({
                        name,
                        type: 'config',
                        code,
                        start: match.index,
                        end: match.index + match[0].length,
                        file: filePath,
                    });
                }
            }
        }

        return items;
    },

    generatePrompt(item: ExtractedItem, numVariants = 5): string {
        return `Generate ${numVariants} alternative configurations for this setting.

ORIGINAL CONFIG:
${item.code}

CONFIG NAME: "${item.name}"

RULES:
1. Maintain the same structure and keys
2. Vary the VALUES based on different strategies:
   - v1: More conservative/strict thresholds
   - v2: More lenient/relaxed thresholds  
   - v3: Optimized for speed (smaller limits)
   - v4: Optimized for quality (higher limits)
   - v5: Balanced middle-ground

Return ${numVariants} config objects, each starting with:
// VARIANT N: [strategy description]
{ config object }`;
    },
};

export default configExtractor;
