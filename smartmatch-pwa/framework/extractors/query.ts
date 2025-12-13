/**
 * LZFOF 2.0 - Query Extractor
 */

import fs from 'fs';
import type { ExtractedItem, Extractor } from '../types.js';

export const queryExtractor: Extractor = {
    type: 'query',

    extract(filePath: string): ExtractedItem[] {
        const items: ExtractedItem[] = [];
        const content = fs.readFileSync(filePath, 'utf8');

        // Find template literal queries
        const queryPatterns = [
            // Queries with site: operators
            /(?:const|let)\s+(\w*[Qq]uery\w*)\s*=\s*`([^`]*site:[^`]+)`/g,
            // CSE/search query patterns
            /queries\.push\(\s*`([^`]+)`\s*\)/g,
            // Array of queries
            /(?:const|let)\s+(queries|QUERIES)\s*(?::\s*[^=]+)?\s*=\s*\[([\s\S]*?)\]/g,
        ];

        const seen = new Set<string>();

        for (const pattern of queryPatterns) {
            pattern.lastIndex = 0;
            let match: RegExpExecArray | null;

            while ((match = pattern.exec(content)) !== null) {
                const name = match[1] || 'query';
                const query = match[2] || match[1];
                if (!query || query.length < 10) continue;

                const key = `${name}-${match.index}`;
                if (seen.has(key)) continue;
                seen.add(key);

                items.push({
                    name,
                    type: 'query',
                    code: query.trim(),
                    start: match.index,
                    end: match.index + match[0].length,
                    file: filePath,
                    metadata: {
                        hasSiteOperator: query.includes('site:'),
                        hasIntitle: query.includes('intitle:'),
                    },
                });
            }
        }

        return items;
    },

    generatePrompt(item: ExtractedItem, numVariants = 5): string {
        return `Generate ${numVariants} alternative search query patterns.

ORIGINAL QUERY:
${item.code}

CONTEXT: This is a search query pattern named "${item.name}"

RULES:
1. Keep the same INTENT (finding the same type of content)
2. Vary the query operators and structure
3. Consider different search engines (Google, DDG)
4. Each variant should try a DIFFERENT approach:
   - v1: Exact phrase matching with quotes
   - v2: More specific operators (intitle:, inurl:)
   - v3: Broader terms for more results
   - v4: Exclusion operators for precision
   - v5: Different site targeting

Return ${numVariants} query patterns, each starting with:
// VARIANT N: [approach description]
\`query template\``;
    },
};

export default queryExtractor;
