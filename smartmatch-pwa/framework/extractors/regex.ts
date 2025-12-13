/**
 * LZFOF 2.0 - Regex Extractor
 */

import fs from 'fs';
import type { ExtractedItem, Extractor } from '../types.js';

// Patterns to find regex definitions
const REGEX_FINDERS = [
    // const NAME = /pattern/flags
    /(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*=\s*(\/(?:[^\/\\]|\\.)+\/[gimsuvy]*)/g,
    // NAME: /pattern/flags (in objects)
    /([A-Z_][A-Z0-9_]*)\s*:\s*(\/(?:[^\/\\]|\\.)+\/[gimsuvy]*)/g,
];

export const regexExtractor: Extractor = {
    type: 'regex',

    extract(filePath: string): ExtractedItem[] {
        const code = fs.readFileSync(filePath, 'utf8');
        const items: ExtractedItem[] = [];
        const seen = new Set<string>();

        for (const finder of REGEX_FINDERS) {
            finder.lastIndex = 0;
            let match: RegExpExecArray | null;

            while ((match = finder.exec(code)) !== null) {
                const name = match[1];
                const pattern = match[2];
                if (!name || !pattern) continue;

                const key = `${name}-${match.index}`;
                if (seen.has(key)) continue;
                seen.add(key);

                items.push({
                    name,
                    type: 'regex',
                    code: pattern,
                    start: match.index,
                    end: match.index + match[0].length,
                    file: filePath,
                    metadata: { flags: pattern.match(/\/([gimsuvy]*)$/)?.[1] || '' },
                });
            }
        }
        return items.sort((a, b) => a.start - b.start);
    },

    generatePrompt(item: ExtractedItem, numVariants = 5): string {
        return `Generate ${numVariants} alternative regex patterns for this use case.

ORIGINAL REGEX:
${item.code}

CONTEXT: This regex is named "${item.name}"

RULES:
1. Keep EXACT matching behavior - same strings match, same strings don't
2. Optimize for performance (fewer backtracking)
3. Improve readability where possible
4. Consider edge cases
5. Each variant should try a DIFFERENT approach:
   - v1: Simplify character classes
   - v2: Use non-capturing groups
   - v3: Optimize for common cases (early match)
   - v4: More explicit patterns
   - v5: Alternative approach entirely

Return ${numVariants} regex patterns, each on its own line starting with:
// VARIANT N: [description]
/pattern/flags`;
    },
};

export default regexExtractor;
