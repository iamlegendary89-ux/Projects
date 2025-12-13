#!/usr/bin/env node
/**
 * SmartMatch AI - Structured Error System
 * Centralized error handling with classification, context, and recovery suggestions
 */

import fs from "fs/promises";
import path from "path";

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export type ERROR_SEVERITY_TYPE = (typeof ERROR_SEVERITY)[keyof typeof ERROR_SEVERITY];

/**
 * Error categories for classification
 */
export const ERROR_CATEGORY = {
  NETWORK: "network",
  DATABASE: "database",
  API: "api",
  VALIDATION: "validation",
  AUTHENTICATION: "authentication",
  QUOTA: "quota",
  TIMEOUT: "timeout",
  PARSING: "parsing",
  FILESYSTEM: "filesystem",
  UNKNOWN: "unknown",
} as const;

export type ERROR_CATEGORY_TYPE = (typeof ERROR_CATEGORY)[keyof typeof ERROR_CATEGORY];

/**
 * Options for creating pipeline errors
 */
export interface PipelineErrorOptions {
  phase?: string;
  category?: ERROR_CATEGORY_TYPE;
  severity?: ERROR_SEVERITY_TYPE;
  context?: Record<string, any>;
  runId?: string | null;
  suggestedRecovery?: string | null;
  retryable?: boolean;
  errorCode?: string | null;
}

/**
 * Error classification result for retry decisions
 */
export interface ErrorClassification {
  retryable: boolean;
  category: ERROR_CATEGORY_TYPE;
  delayMultiplier?: number;
}

/**
 * Structured error class for pipeline operations
 */
export class PipelineError extends Error {
  public phase: string;
  public category: ERROR_CATEGORY_TYPE;
  public severity: ERROR_SEVERITY_TYPE;
  public context: Record<string, any>;
  public runId: string | null;
  public timestamp: string;
  public suggestedRecovery: string | null;
  public retryable: boolean;
  public errorCode: string | null;

  constructor(message: string, options: PipelineErrorOptions = {}) {
    super(message);

    this.phase = options.phase || "unknown";
    this.category = options.category || ERROR_CATEGORY.UNKNOWN;
    this.severity = options.severity || ERROR_SEVERITY.MEDIUM;
    this.context = options.context || {};
    this.runId = options.runId || null;
    this.timestamp = new Date().toISOString();
    this.suggestedRecovery = options.suggestedRecovery || null;
    this.retryable = options.retryable !== false;
    this.errorCode = options.errorCode || null;

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PipelineError);
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      phase: this.phase,
      category: this.category,
      severity: this.severity,
      context: this.context,
      runId: this.runId,
      timestamp: this.timestamp,
      suggestedRecovery: this.suggestedRecovery,
      retryable: this.retryable,
      errorCode: this.errorCode,
      stack: this.stack,
    };
  }

  /**
   * Create a user-friendly error message
   */
  toUserMessage(): string {
    let message = `❌ ${this.phase.toUpperCase()} ERROR: ${this.message}`;

    if (this.suggestedRecovery) {
      message += `\n💡 Suggested recovery: ${this.suggestedRecovery}`;
    }

    if (this.context['phoneId']) {
      message += `\n📱 Affected phone: ${this.context['phoneId']}`;
    }

    return message;
  }
}

/**
 * Discovery phase specific errors
 */
export class DiscoveryError extends PipelineError {
  constructor(message: string, context: Partial<PipelineErrorOptions> = {}) {
    super(message, {
      phase: "discovery",
      category: context.category || ERROR_CATEGORY.API,
      severity: context.severity || ERROR_SEVERITY.MEDIUM,
      context,
      suggestedRecovery: context.suggestedRecovery || "Check API quotas and network connectivity",
    });
    this.name = "DiscoveryError";
  }
}

/**
 * Enrichment phase specific errors
 */
export class EnrichmentError extends PipelineError {
  constructor(message: string, context: Partial<PipelineErrorOptions> = {}) {
    super(message, {
      phase: "enrichment",
      category: context.category || ERROR_CATEGORY.API,
      severity: context.severity || ERROR_SEVERITY.HIGH,
      context,
      suggestedRecovery: context.suggestedRecovery || "Check AI API quotas and model availability",
    });
    this.name = "EnrichmentError";
  }
}

/**
 * Sync phase specific errors
 */
export class SyncError extends PipelineError {
  constructor(message: string, context: Partial<PipelineErrorOptions> = {}) {
    super(message, {
      phase: "sync",
      category: context.category || ERROR_CATEGORY.DATABASE,
      severity: context.severity || ERROR_SEVERITY.CRITICAL,
      context,
      suggestedRecovery: context.suggestedRecovery || "Check database connectivity and data integrity",
    });
    this.name = "SyncError";
  }
}

/**
 * Error summary statistics
 */
export interface ErrorSummary {
  total: number;
  byPhase: Record<string, number>;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  critical: number;
  retryable: number;
}

/**
 * Error handler for pipeline operations
 */
export class ErrorHandler {
  public runId: string | null;
  public errors: PipelineError[];
  public startTime: number;

  constructor(runId: string | null = null) {
    this.runId = runId;
    this.errors = [];
    this.startTime = Date.now();
  }

  /**
   * Handle an error with context
   */
  handle(error: Error | PipelineError, context: Partial<PipelineErrorOptions> = {}): PipelineError {
    // Ensure error is structured
    const structuredError =
      error instanceof PipelineError
        ? error
        : new PipelineError(error.message || String(error), {
          phase: context.phase || "unknown",
          category: context.category || ERROR_CATEGORY.UNKNOWN,
          severity: context.severity || ERROR_SEVERITY.MEDIUM,
          context: { ...(error as any).context, ...context },
          runId: this.runId,
        });

    this.errors.push(structuredError);

    // Log error with context
    console.error(`🚨 ${structuredError.name}: ${structuredError.message}`);
    if (structuredError.context) {
      console.error(`   Context:`, structuredError.context);
    }

    return structuredError;
  }

  /**
   * Check if there are any critical errors
   */
  hasCriticalErrors(): boolean {
    return this.errors.some((error) => error.severity === ERROR_SEVERITY.CRITICAL);
  }

  /**
   * Get error summary statistics
   */
  getSummary(): ErrorSummary {
    const summary: ErrorSummary = {
      total: this.errors.length,
      byPhase: {},
      byCategory: {},
      bySeverity: {},
      critical: 0,
      retryable: 0,
    };

    for (const error of this.errors) {
      // Count by phase
      summary.byPhase[error.phase] = (summary.byPhase[error.phase] || 0) + 1;

      // Count by category
      summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + 1;

      // Count by severity
      summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;

      // Count critical errors
      if (error.severity === ERROR_SEVERITY.CRITICAL) {
        summary.critical++;
      }

      // Count retryable errors
      if (error.retryable) {
        summary.retryable++;
      }
    }

    return summary;
  }

  /**
   * Generate error summary table
   */
  generateSummaryTable(): string {
    const summary = this.getSummary();

    if (summary.total === 0) {
      return "✅ No errors occurred";
    }

    let table = "\n📊 ERROR SUMMARY\n";
    table += "┌" + "─".repeat(60) + "┐\n";
    table += `│ Total Errors: ${summary.total.toString().padEnd(47)} │\n`;
    table += `│ Critical: ${summary.critical.toString().padEnd(50)} │\n`;
    table += `│ Retryable: ${summary.retryable.toString().padEnd(48)} │\n`;
    table += "├" + "─".repeat(60) + "┤\n";

    // By phase
    if (Object.keys(summary.byPhase).length > 0) {
      table += "│ By Phase:".padEnd(61) + "│\n";
      for (const [phase, count] of Object.entries(summary.byPhase)) {
        table += `│   ${phase}: ${count.toString().padEnd(53)} │\n`;
      }
      table += "├" + "─".repeat(60) + "┤\n";
    }

    // By category
    if (Object.keys(summary.byCategory).length > 0) {
      table += "│ By Category:".padEnd(61) + "│\n";
      for (const [category, count] of Object.entries(summary.byCategory)) {
        table += `│   ${category}: ${count.toString().padEnd(51)} │\n`;
      }
      table += "├" + "─".repeat(60) + "┤\n";
    }

    // By severity
    if (Object.keys(summary.bySeverity).length > 0) {
      table += "│ By Severity:".padEnd(61) + "│\n";
      for (const [severity, count] of Object.entries(summary.bySeverity)) {
        table += `│   ${severity}: ${count.toString().padEnd(51)} │\n`;
      }
    }

    table += "└" + "─".repeat(60) + "┘\n";

    return table;
  }

  /**
   * Export errors to JSON file
   */
  async exportToFile(filePath: string): Promise<any> {
    const errorData = {
      runId: this.runId,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - this.startTime,
      summary: this.getSummary(),
      errors: this.errors.map((error) => error.toJSON()),
    };

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(errorData, null, 2));

    console.log(`📄 Error summary exported to ${filePath}`);
    return errorData;
  }

  /**
   * Get exit code based on error severity
   */
  getExitCode(): number {
    if (this.hasCriticalErrors()) {
      return 1; // Critical errors
    }
    if (this.errors.length > 0) {
      return 2; // Non-critical errors
    }
    return 0; // Success
  }
}

/**
 * Global error handler instance
 */
export const globalErrorHandler = new ErrorHandler();

/**
 * Wrap function with error handling
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  phase: string,
  context: Partial<PipelineErrorOptions> = {},
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const structuredError = globalErrorHandler.handle(error as Error, {
        phase,
        ...context,
      });

      // Re-throw structured error
      throw structuredError;
    }
  }) as T;
}

/**
 * Create error from various input types
 */
export function createError(type: string, message: string, context: Partial<PipelineErrorOptions> = {}): PipelineError {
  switch (type) {
    case "discovery":
      return new DiscoveryError(message, context);
    case "enrichment":
      return new EnrichmentError(message, context);
    case "sync":
      return new SyncError(message, context);
    default:
      return new PipelineError(message, context);
  }
}

/**
 * Classify error for retry decisions
 */
export function classifyErrorForRetry(error: any): ErrorClassification {
  const message = error.message?.toLowerCase() || "";
  const code = error.code?.toLowerCase() || "";
  const status = error.status || error.response?.status;

  // Network errors - retryable
  if (
    code === "enotfound" ||
    code === "econnrefused" ||
    code === "econnreset" ||
    message.includes("network") ||
    message.includes("connection")
  ) {
    return { retryable: true, category: ERROR_CATEGORY.NETWORK };
  }

  // Timeout errors - retryable
  if (message.includes("timeout") || code === "etimedout") {
    return { retryable: true, category: ERROR_CATEGORY.TIMEOUT };
  }

  // Rate limiting - retryable with longer delay
  if (status === 429 || message.includes("rate limit") || message.includes("quota")) {
    return { retryable: true, category: ERROR_CATEGORY.QUOTA, delayMultiplier: 5 };
  }

  // Server errors - retryable
  if (status >= 500 && status < 600) {
    return { retryable: true, category: ERROR_CATEGORY.API };
  }

  // Authentication errors - not retryable
  if (status === 401 || message.includes("unauthorized") || message.includes("authentication")) {
    return { retryable: false, category: ERROR_CATEGORY.AUTHENTICATION };
  }

  // Database errors - retryable
  if (message.includes("database") || message.includes("supabase") || message.includes("sql")) {
    return { retryable: true, category: ERROR_CATEGORY.DATABASE };
  }

  // Validation errors - not retryable
  if (status === 400 || message.includes("validation") || message.includes("invalid")) {
    return { retryable: false, category: ERROR_CATEGORY.VALIDATION };
  }

  return { retryable: false, category: ERROR_CATEGORY.UNKNOWN };
}
