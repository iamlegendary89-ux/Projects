/**
 * Centralized JSONL Logger for SmartMatch Pipeline
 *
 * Writes structured logs in JSONL format to logs/{phase}-{runId}.log
 * Each log entry is a JSON object with timestamp, level, message, and optional data.
 */

import fs from "fs/promises";
import path from "path";

/**
 * Supported log levels
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  phase: string;
  runId: string;
  message: string;
  data?: any;
}

const LOGS_DIR = path.join(process.cwd(), "logs");

class JSONLLogger {
  public readonly phase: string;
  public readonly runId: string;
  public readonly logFile: string;

  constructor(phase: string, runId: string) {
    this.phase = phase;
    this.runId = runId;
    this.logFile = path.join(LOGS_DIR, `${phase}-${runId}.log`);
  }

  async init(): Promise<void> {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  }

  async log(level: LogLevel, message: string, data: any = null): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      phase: this.phase,
      runId: this.runId,
      message,
      ...(data && { data }),
    };

    // Write to file
    try {
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + "\n");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Fallback to console if file write fails
      console.error(`Failed to write log: ${errorMessage}`);
      console.log(JSON.stringify(logEntry));
    }

    // Also output to console for immediate visibility
    const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    if (data) {
      console.log(consoleMessage, data);
    } else {
      console.log(consoleMessage);
    }
  }

  async info(message: string, data: any = null): Promise<void> {
    await this.log("info", message, data);
  }

  async warn(message: string, data: any = null): Promise<void> {
    await this.log("warn", message, data);
  }

  async error(message: string, data: any = null): Promise<void> {
    await this.log("error", message, data);
  }

  async debug(message: string, data: any = null): Promise<void> {
    await this.log("debug", message, data);
  }
}

// Factory function to create logger for a phase
export function createLogger(phase: string, runId: string): JSONLLogger {
  return new JSONLLogger(phase, runId);
}

// Convenience function for quick logging
export async function logToFile(
  phase: string,
  runId: string,
  level: LogLevel,
  message: string,
  data: any = null,
): Promise<void> {
  const logger = createLogger(phase, runId);
  await logger.init();
  await logger.log(level, message, data);
}
