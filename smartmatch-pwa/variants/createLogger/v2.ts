// VARIANT 2: Class-based logger - more traditional OOP approach

import fs from 'fs/promises';
import path from 'path';

class Logger {
    private logFile: string;
    private startTime: number;

    constructor(name: string, logsDir: string) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        this.logFile = path.join(logsDir, `${name}_${timestamp}.log`);
        this.startTime = Date.now();
        fs.mkdir(logsDir, { recursive: true }).catch(() => { });
    }

    private write(level: string, phase: string, msg: string, meta?: unknown) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
        const elapsed = Date.now() - this.startTime;

        const emoji = level === 'ERROR' ? '❌' : level === 'WARNING' ? '⚠️' : level === 'SUCCESS' ? '✅' : 'ℹ️';
        const color = level === 'ERROR' ? '\x1b[31m' : level === 'WARNING' ? '\x1b[33m' : level === 'SUCCESS' ? '\x1b[32m' : '\x1b[36m';

        console.log(`${emoji} ${color}[${phase}]\x1b[0m [${timeStr}] ${msg}`);
        fs.appendFile(this.logFile, JSON.stringify({ timestamp: now.toISOString(), level, phase, msg, meta, elapsed }) + '\n').catch(() => { });
    }

    async init() { try { await fs.access(path.dirname(this.logFile)); } catch { console.error('❌ Cannot write to log dir'); } }
    info(phase: string, msg: string, meta?: unknown) { this.write('INFO', phase, msg, meta); }
    success(phase: string, msg: string, meta?: unknown) { this.write('SUCCESS', phase, msg, meta); }
    warn(phase: string, msg: string, meta?: unknown) { this.write('WARNING', phase, msg, meta); }
    error(phase: string, msg: string, meta?: unknown) { this.write('ERROR', phase, msg, meta); }
}

export function createLogger(name: string, config: { PATHS: { LOGS: string } }) {
    return new Logger(name, config.PATHS.LOGS);
}
