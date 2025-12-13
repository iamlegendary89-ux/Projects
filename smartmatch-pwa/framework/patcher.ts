/**
 * LZFOF v2.1 - Code Patcher
 * 
 * Automatically replaces function blocks in original files with winning variants.
 */

import fs from 'fs';
import path from 'path';

export interface PatchResult {
    success: boolean;
    originalFile: string;
    backupFile: string;
    functionName: string;
    linesChanged: number;
    error?: string;
}

// Find function boundaries in source code
function findFunctionBounds(
    code: string,
    functionName: string
): { start: number; end: number } | null {
    // Pattern to find function declaration
    const patterns = [
        new RegExp(`^(export\\s+)?(async\\s+)?function\\s+${functionName}\\s*\\(`, 'gm'),
        new RegExp(`^(export\\s+)?const\\s+${functionName}\\s*=\\s*(async\\s+)?\\(`, 'gm'),
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(code);
        if (match) {
            const start = match.index;
            // Find matching closing brace
            let depth = 0;
            let inString = false;
            let stringChar = '';
            let foundOpen = false;

            for (let i = start; i < code.length; i++) {
                const char = code[i];
                const prev = code[i - 1];

                // String handling
                if ((char === '"' || char === "'" || char === '`') && prev !== '\\') {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                    }
                    continue;
                }

                if (inString) continue;

                if (char === '{') {
                    depth++;
                    foundOpen = true;
                }
                if (char === '}') {
                    depth--;
                    if (foundOpen && depth === 0) {
                        return { start, end: i + 1 };
                    }
                }
            }
        }
    }

    return null;
}

// Extract just the function body from a variant file
function extractFunctionBody(variantCode: string, functionName: string): string | null {
    const bounds = findFunctionBounds(variantCode, functionName);
    if (!bounds) return null;
    return variantCode.slice(bounds.start, bounds.end);
}

// Apply a winning variant to the original file
export function applyPatch(
    originalFile: string,
    variantFile: string,
    functionName: string
): PatchResult {
    try {
        // Read files
        const originalCode = fs.readFileSync(originalFile, 'utf8');
        const variantCode = fs.readFileSync(variantFile, 'utf8');

        // Find function in original
        const originalBounds = findFunctionBounds(originalCode, functionName);
        if (!originalBounds) {
            return {
                success: false,
                originalFile,
                backupFile: '',
                functionName,
                linesChanged: 0,
                error: `Function "${functionName}" not found in ${originalFile}`,
            };
        }

        // Extract new function body from variant
        const newFunction = extractFunctionBody(variantCode, functionName);
        if (!newFunction) {
            return {
                success: false,
                originalFile,
                backupFile: '',
                functionName,
                linesChanged: 0,
                error: `Function "${functionName}" not found in ${variantFile}`,
            };
        }

        // Create backup
        const backupFile = `${originalFile}.backup.${Date.now()}`;
        fs.writeFileSync(backupFile, originalCode);

        // Apply patch
        const newCode =
            originalCode.slice(0, originalBounds.start) +
            newFunction +
            originalCode.slice(originalBounds.end);

        fs.writeFileSync(originalFile, newCode);

        // Count lines changed
        const oldLines = originalCode.slice(originalBounds.start, originalBounds.end).split('\n').length;
        const newLines = newFunction.split('\n').length;

        return {
            success: true,
            originalFile,
            backupFile,
            functionName,
            linesChanged: Math.abs(newLines - oldLines),
        };
    } catch (e) {
        return {
            success: false,
            originalFile,
            backupFile: '',
            functionName,
            linesChanged: 0,
            error: e instanceof Error ? e.message : String(e),
        };
    }
}

// Copy winner to winners directory
export function saveWinner(
    targetName: string,
    variantFile: string,
    analysisData: Record<string, unknown>
): string {
    const winnersDir = './winners';
    if (!fs.existsSync(winnersDir)) {
        fs.mkdirSync(winnersDir, { recursive: true });
    }

    const ext = path.extname(variantFile);
    const winnerPath = path.join(winnersDir, `${targetName}${ext}`);

    fs.copyFileSync(variantFile, winnerPath);

    // Save analysis alongside
    const analysisPath = path.join(winnersDir, `${targetName}.analysis.json`);
    fs.writeFileSync(analysisPath, JSON.stringify(analysisData, null, 2));

    return winnerPath;
}

// Rollback to backup
export function rollback(backupFile: string): boolean {
    try {
        const originalFile = backupFile.replace(/\.backup\.\d+$/, '');
        fs.copyFileSync(backupFile, originalFile);
        return true;
    } catch {
        return false;
    }
}

export default { applyPatch, saveWinner, rollback };
