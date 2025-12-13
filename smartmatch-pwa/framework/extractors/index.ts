/**
 * LZFOF 2.0 - Extractor Index
 */

import { functionExtractor } from './function.js';
import { regexExtractor } from './regex.js';
import { promptExtractor } from './prompt.js';
import { configExtractor } from './config.js';
import { queryExtractor } from './query.js';
import type { Extractor, TargetType } from '../types.js';

export const extractors: Record<TargetType, Extractor> = {
    function: functionExtractor,
    regex: regexExtractor,
    prompt: promptExtractor,
    config: configExtractor,
    query: queryExtractor,
    struct: functionExtractor, // Fallback - uses function extractor
};

export function getExtractor(type: TargetType): Extractor {
    return extractors[type] || extractors.function;
}

export { functionExtractor, regexExtractor, promptExtractor, configExtractor, queryExtractor };
