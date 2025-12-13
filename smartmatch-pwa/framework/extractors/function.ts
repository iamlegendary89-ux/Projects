/**
 * LZFOF 2.0 - Function Extractor
 */

import fs from 'fs';
import path from 'path';
import type { ExtractedItem, Extractor } from '../types.js';

const CONTROL_FLOW = new Set(['if', 'else', 'for', 'while', 'switch', 'catch', 'try', 'do', 'with']);

const PATTERNS: Record<string, RegExp[]> = {
    js: [
        /^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*(?::\s*\w+(?:<[^>]+>)?)?\s*\{/gm,
        /^(?:export\s+)?const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*\w+(?:<[^>]+>)?)?\s*=>/gm,
        /^\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*(?::\s*\w+(?:<[^>]+>)?)?\s*\{/gm,
    ],
    py: [/^(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?:->\s*\w+)?\s*:/gm],
    go: [/^func\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?:\([^)]*\)|[\w*]+)?\s*\{/gm],
    rs: [/^(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?:->\s*[\w<>]+)?\s*\{/gm],
};

function detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    if (['ts', 'tsx', 'mts', 'js', 'jsx', 'mjs'].includes(ext)) return 'js';
    return ext;
}

function findMatchingBrace(code: string, startIndex: number): number {
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = startIndex; i < code.length; i++) {
        const char = code[i];
        const prevChar = code[i - 1];

        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
            if (!inString) { inString = true; stringChar = char; }
            else if (char === stringChar) { inString = false; }
            continue;
        }
        if (inString) continue;
        if (char === '{') depth++;
        if (char === '}') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

export const functionExtractor: Extractor = {
    type: 'function',

    extract(filePath: string): ExtractedItem[] {
        const code = fs.readFileSync(filePath, 'utf8');
        const language = detectLanguage(filePath);
        const patterns = PATTERNS[language] || PATTERNS.js;
        const items: ExtractedItem[] = [];
        const seen = new Set<string>();

        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            let match: RegExpExecArray | null;

            while ((match = pattern.exec(code)) !== null) {
                const name = match[1];
                if (!name || CONTROL_FLOW.has(name.toLowerCase())) continue;

                const start = match.index;
                if (seen.has(`${name}-${start}`)) continue;
                seen.add(`${name}-${start}`);

                const braceStart = code.indexOf('{', start);
                if (braceStart === -1) continue;
                const end = findMatchingBrace(code, braceStart);
                if (end === -1) continue;

                items.push({
                    name,
                    type: 'function',
                    code: code.slice(start, end + 1),
                    start,
                    end: end + 1,
                    file: filePath,
                });
            }
        }
        return items.sort((a, b) => a.start - b.start);
    },

    generatePrompt(item: ExtractedItem, numVariants = 5): string {
        return `Generate ${numVariants} alternative implementations of this function.

ORIGINAL CODE:
\`\`\`
${item.code}
\`\`\`

RULES:
1. Keep EXACT behavior identical - same inputs produce same outputs
2. Minimize line count and cognitive complexity
3. Optimize for readability AND performance
4. Do NOT change function signature (inputs/outputs)
5. Each variant should try a DIFFERENT approach

Return ${numVariants} code blocks, each starting with:
// VARIANT N: [brief description]`;
    },
};

export default functionExtractor;
