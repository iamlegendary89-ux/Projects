#!/usr/bin/env node
/**
 * LZFOF v1.0 - Module 1: Universal Function Extractor
 * 
 * Extracts all top-level functions from ANY file (JS/TS/Python/Go/Rust)
 * using language-aware regex patterns.
 * 
 * Usage: node extractor.js <file>
 * Output: JSON array of { name, start, end, code }
 */

import fs from "fs";
import path from "path";

// Control flow keywords to filter out
const CONTROL_FLOW = new Set(['if', 'else', 'for', 'while', 'switch', 'catch', 'try', 'do', 'with']);

// Language detection by extension
const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
    // JavaScript/TypeScript - only match actual function declarations
    js: [
        // Named function: function name(...) { }
        /^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*(?::\s*\w+(?:<[^>]+>)?)?\s*\{/gm,
        // Arrow const: const name = (...) => { }
        /^(?:export\s+)?const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*\w+(?:<[^>]+>)?)?\s*=>/gm,
        // Class method: name(...) { } 
        /^\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*(?::\s*\w+(?:<[^>]+>)?)?\s*\{/gm,
    ],
    ts: [], // Same as JS, will fall through

    // Python
    py: [
        /^(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?:->\s*\w+)?\s*:/gm,
    ],

    // Go
    go: [
        /^func\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?:\([^)]*\)|[\w*]+)?\s*\{/gm,
    ],

    // Rust
    rs: [
        /^(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?:->\s*[\w<>]+)?\s*\{/gm,
    ],
};

interface FunctionInfo {
    name: string;
    start: number;
    end: number;
    code: string;
    language: string;
}

function detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    if (ext === "ts" || ext === "tsx" || ext === "mts") return "js";
    if (ext === "js" || ext === "jsx" || ext === "mjs") return "js";
    return ext;
}

function findMatchingBrace(code: string, startIndex: number): number {
    let depth = 0;
    let inString = false;
    let stringChar = "";

    for (let i = startIndex; i < code.length; i++) {
        const char = code[i];
        const prevChar = code[i - 1];

        if ((char === '"' || char === "'" || char === "`") && prevChar !== "\\") {
            if (!inString) {
                inString = true;
                stringChar = char;
            } else if (char === stringChar) {
                inString = false;
            }
            continue;
        }

        if (inString) continue;

        if (char === "{") depth++;
        if (char === "}") {
            depth--;
            if (depth === 0) return i;
        }
    }

    return -1;
}

function findPythonBlockEnd(code: string, startLine: number): number {
    const lines = code.split("\n");
    const startIndent = lines[startLine]?.match(/^(\s*)/)?.[1].length || 0;

    for (let i = startLine + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.trim() === "") continue;

        const indent = line.match(/^(\s*)/)?.[1].length || 0;
        if (indent <= startIndent && line.trim() !== "") {
            return lines.slice(0, i).join("\n").length;
        }
    }

    return code.length;
}

export function extractFunctions(filePath: string): FunctionInfo[] {
    const code = fs.readFileSync(filePath, "utf8");
    const language = detectLanguage(filePath);
    const patterns = LANGUAGE_PATTERNS[language] || LANGUAGE_PATTERNS.js;

    const functions: FunctionInfo[] = [];
    const seen = new Set<string>();

    for (const pattern of patterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(code)) !== null) {
            const name = match[1];
            if (!name) continue;

            // Skip control flow keywords
            if (CONTROL_FLOW.has(name.toLowerCase())) continue;

            const start = match.index;
            if (seen.has(`${name}-${start}`)) continue;
            seen.add(`${name}-${start}`);

            let end: number;

            if (language === "py") {
                const lineNumber = code.slice(0, start).split("\n").length - 1;
                end = findPythonBlockEnd(code, lineNumber);
            } else {
                const braceStart = code.indexOf("{", start);
                if (braceStart === -1) continue;
                end = findMatchingBrace(code, braceStart);
                if (end === -1) continue;
                end++;
            }

            functions.push({
                name,
                start,
                end,
                code: code.slice(start, end),
                language,
            });
        }
    }

    return functions.sort((a, b) => a.start - b.start);
}

// CLI entry point
if (process.argv[1]?.includes("extractor")) {
    const file = process.argv[2];
    if (!file) {
        console.error("Usage: node extractor.js <file>");
        process.exit(1);
    }

    const functions = extractFunctions(file);
    console.log(JSON.stringify(functions, null, 2));
    console.error(`\n✅ Extracted ${functions.length} functions from ${file}`);
}

export default extractFunctions;
