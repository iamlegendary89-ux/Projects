/**
 * LZFOF 2.0 - Prompt Extractor
 */

import fs from 'fs';
import path from 'path';
import type { ExtractedItem, Extractor } from '../types.js';

export const promptExtractor: Extractor = {
    type: 'prompt',

    extract(filePath: string): ExtractedItem[] {
        const items: ExtractedItem[] = [];

        // If directory, scan for .md/.txt/.prompt files
        const stat = fs.statSync(filePath);
        const files = stat.isDirectory()
            ? fs.readdirSync(filePath)
                .filter(f => /\.(md|txt|prompt)$/.test(f))
                .map(f => path.join(filePath, f))
            : [filePath];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const name = path.basename(file, path.extname(file));

            items.push({
                name,
                type: 'prompt',
                code: content,
                start: 0,
                end: content.length,
                file,
                metadata: {
                    wordCount: content.split(/\s+/).length,
                    lineCount: content.split('\n').length,
                },
            });
        }

        // Also find template literals in code files
        if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
            const code = fs.readFileSync(filePath, 'utf8');
            const templatePattern = /(?:const|let)\s+(\w*[Pp]rompt\w*)\s*=\s*`([\s\S]*?)`/g;
            let match: RegExpExecArray | null;

            while ((match = templatePattern.exec(code)) !== null) {
                const name = match[1];
                const template = match[2];
                if (!name || !template || template.length < 50) continue;

                items.push({
                    name,
                    type: 'prompt',
                    code: template,
                    start: match.index,
                    end: match.index + match[0].length,
                    file: filePath,
                    metadata: {
                        wordCount: template.split(/\s+/).length,
                        isTemplate: true,
                    },
                });
            }
        }

        return items;
    },

    generatePrompt(item: ExtractedItem, numVariants = 5): string {
        return `Generate ${numVariants} alternative prompts for this AI task.

ORIGINAL PROMPT:
"""
${item.code}
"""

RULES:
1. Keep the SAME goal and expected output format
2. Optimize for clarity and specificity
3. Consider token efficiency (shorter but equally effective)
4. Each variant should try a DIFFERENT approach:
   - v1: More structured instructions
   - v2: Chain of thought / step by step
   - v3: Few-shot with examples
   - v4: Role-based ("You are an expert...")
   - v5: Minimal / concise

Return ${numVariants} prompts, each starting with:
// VARIANT N: [approach description]
"""
prompt text
"""`;
    },
};

export default promptExtractor;
