// VARIANT 2: Pre-compiled regex for performance

import path from 'path';

const WHITESPACE = /\s+/g;
const INVALID_CHARS = /[^\w\-_.]/g;

export function normalizePath(brand: string, model: string, contentDir = './data/content'): string {
    const normalized = `${brand}_${model}`.toLowerCase().replace(WHITESPACE, '_').replace(INVALID_CHARS, '');
    return path.join(contentDir, normalized);
}
