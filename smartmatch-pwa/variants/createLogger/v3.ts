// VARIANT 3: Minimal - most compact version
// Uses partial application for level binding

import fs from 'fs/promises';
import path from 'path';

export function createLogger(name: string, config: { PATHS: { LOGS: string } }) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const file = path.join(config.PATHS.LOGS, `${name}_${ts}.log`);
    const t0 = Date.now();

    fs.mkdir(config.PATHS.LOGS, { recursive: true }).catch(() => { });

    const log = (lvl: string, emoji: string, color: string) => (phase: string, msg: string, meta?: unknown) => {
        const now = new Date();
        console.log(`${emoji} ${color}[${phase}]\x1b[0m [${now.toLocaleTimeString('en-US', { hour12: false })}] ${msg}`);
        fs.appendFile(file, JSON.stringify({ timestamp: now.toISOString(), level: lvl, phase, msg, meta, elapsed: Date.now() - t0 }) + '\n').catch(() => { });
    };

    return {
        init: async () => { try { await fs.access(config.PATHS.LOGS); } catch { console.error('❌ Log dir not writable'); } },
        info: log('INFO', 'ℹ️', '\x1b[36m'),
        success: log('SUCCESS', '✅', '\x1b[32m'),
        warn: log('WARNING', '⚠️', '\x1b[33m'),
        error: log('ERROR', '❌', '\x1b[31m'),
    };
}
