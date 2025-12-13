/**
 * LZFOF 2.0 - Runner Index
 */

import { functionRunner } from './function.js';
import { regexRunner } from './regex.js';
import { promptRunner } from './prompt.js';
import type { Runner, TargetType } from '../types.js';

export const runners: Record<TargetType, Runner> = {
    function: functionRunner,
    regex: regexRunner,
    prompt: promptRunner,
    config: functionRunner, // Uses function runner with config test format
    query: regexRunner,     // Uses regex runner with query test format
    struct: functionRunner, // Uses function runner
};

export function getRunner(type: TargetType): Runner {
    return runners[type] || runners.function;
}

export { functionRunner, regexRunner, promptRunner };
