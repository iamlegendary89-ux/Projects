// VARIANT 1: Simplified with constants and arrow functions
// Reduced duplication, cleaner structure

import fs from 'fs/promises';
import path from 'path';

const EMOJI: Record<string, string> = { ERROR: '❌', WARNING: '⚠️', SUCCESS: '✅', INFO: 'ℹ️' };
const COLOR: Record<string, string> = { ERROR: '\x1b[31m', WARNING: '\x1b[33m', SUCCESS: '\x1b[32m', INFO: '\x1b[36m' };
const RESET = '\x1b[0m';

export function createLogger(name: string, config: { PATHS: { LOGS: string } }) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const logFile = path.join(config.PATHS.LOGS, `${name}_${timestamp}.log`);
    const startTime = Date.now();

    fs.mkdir(config.PATHS.LOGS, { recursive: true }).catch(() => { });

    const write = (level: string, phase: string, msg: string, meta?: unknown) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
        const elapsed = Date.now() - startTime;

        console.log(`${EMOJI[level] || 'ℹ️'} ${COLOR[level] || ''}[${phase}]${RESET} [${timeStr}] ${msg}`);

        const entry = JSON.stringify({ timestamp: now.toISOString(), level, phase, msg, meta, elapsed });
        fs.appendFile(logFile, entry + '\n', 'utf8').catch(() => { });
    };

    return {
        init: async () => { try { await fs.access(config.PATHS.LOGS); } catch { console.error(`❌ Cannot write to: ${config.PATHS.LOGS}`); } },
        info: (phase: string, msg: string, meta?: unknown) => write('INFO', phase, msg, meta),
        success: (phase: string, msg: string, meta?: unknown) => write('SUCCESS', phase, msg, meta),
        warn: (phase: string, msg: string, meta?: unknown) => write('WARNING', phase, msg, meta),
        error: (phase: string, msg: string, meta?: unknown) => write('ERROR', phase, msg, meta),
    };
}
