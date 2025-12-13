#!/usr/bin/env node
/**
 * SmartMatch AI - Retry Utilities
 * Enhanced retry logic with circuit breaker, exponential backoff, and error classification
 */

import { safeReadJson, safeWriteJson } from "./io";

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, maxRetries: number, delay: number) => void;
  onError?: (error: unknown, attempt: number, maxRetries: number) => void;
  failFast?: boolean;
}

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  failureThreshold?: number;
  recoveryTimeout?: number;
  monitoringPeriod?: number;
  successThreshold?: number;
  circuitId?: string;
}

/**
 * Circuit breaker status
 */
export interface CircuitBreakerStatus {
  circuitId: string;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureCount: number;
  failureThreshold: number;
  successCount: number;
  successThreshold: number;
  nextAttempt: number;
  lastFailureTime: number | null;
  isAvailable: boolean;
}

/**
 * Circuit breaker registry statistics
 */
export interface CircuitBreakerStats {
  total: number;
  open: number;
  halfOpen: number;
  closed: number;
  unavailable: number;
}

/**
 * Circuit breaker registry status
 */
export interface CircuitBreakerRegistryStatus {
  [serviceName: string]: CircuitBreakerStatus;
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  NETWORK = "NETWORK",
  TIMEOUT = "TIMEOUT",
  RATE_LIMIT = "RATE_LIMIT",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  NOT_FOUND = "NOT_FOUND",
  SERVER_ERROR = "SERVER_ERROR",
  CLIENT_ERROR = "CLIENT_ERROR",
  JSON_PARSE = "JSON_PARSE",
  DATABASE = "DATABASE",
  AI_SERVICE = "AI_SERVICE",
  UNKNOWN = "UNKNOWN",
}

/**
 * Resilient fetch options
 */
export interface ResilientFetchOptions {
  timeout?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  failFast?: boolean;
  circuitBreaker?: CircuitBreakerOptions;
}

/**
 * Supabase retry context
 */
export interface SupabaseRetryContext {
  phase?: string;
  operationType?: string;
  phoneId?: string | null;
}

/**
 * Failed operation log details
 */
export interface FailedOperationLog {
  phase: string;
  operationType: string;
  phoneId: string | null;
  error: string;
  attempts: number;
  timestamp: string;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
  shouldRetry: (_error: unknown) => true,
  onRetry: (_error: unknown, _attempt: number, _maxRetries: number, _delay: number) => { },
  onError: (_error: unknown, _attempt: number, _maxRetries: number) => { },
  failFast: false,
};

/**
 * Execute function with retry logic and exponential backoff
 * @param fn - Function to execute
 * @param options - Retry configuration options
 * @returns Result of the function execution
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options } as Required<RetryOptions>;
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      const result = await fn();

      // Success - reset any circuit breaker if this function uses one
      if ((globalThis as any).circuitBreakers) {
        const fnName = fn.name || "anonymous";
        if ((globalThis as any).circuitBreakers.has(fnName)) {
          (globalThis as any).circuitBreakers.get(fnName).onSuccess();
        }
      }

      return result;
    } catch (_error: unknown) {
      lastError = _error;

      // Check if we should fail fast for certain error types
      if (opts.failFast && shouldFailFast(_error)) {
        throw _error;
      }

      // Check if we should retry this error
      if (attempt > opts.maxRetries || !opts.shouldRetry(_error)) {
        throw _error;
      }

      // Call error callback if provided
      if (opts.onError) {
        opts.onError(_error, attempt, opts.maxRetries);
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = opts.baseDelayMs * Math.pow(opts.backoffFactor, attempt - 1);
      const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5);
      const delay = Math.min(delayWithJitter, opts.maxDelayMs);

      // Call retry callback if provided
      if (opts.onRetry) {
        opts.onRetry(_error, attempt, opts.maxRetries, delay);
      }

      const errorObj = _error as { message?: string };
      console.warn(
        `⚠️ Retry ${attempt}/${opts.maxRetries} after ${Math.round(delay)}ms:`,
        errorObj.message || String(_error),
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Circuit breaker implementation for fault tolerance
 */
export class CircuitBreaker {
  public readonly failureThreshold: number;
  public readonly recoveryTimeout: number;
  public readonly monitoringPeriod: number;
  public readonly successThreshold: number;
  public failureCount: number;
  public successCount: number;
  public lastFailureTime: number | null;
  public state: "CLOSED" | "OPEN" | "HALF_OPEN";
  public nextAttempt: number;
  public readonly circuitId: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    this.successThreshold = options.successThreshold || 2; // Successes needed to close circuit

    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = 0;
    this.circuitId = options.circuitId || `cb_${Date.now()}_${Math.random()}`;
  }

  /**
   * Execute function with circuit breaker protection
   * @param fn - Function to execute
   * @returns Result of the function execution
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker ${this.circuitId} is OPEN - service unavailable`);
      }
      // Transition to HALF_OPEN for testing
      this.state = "HALF_OPEN";
      this.successCount = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (_error) {
      this.onFailure();
      throw _error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.failureCount = 0;
    this.successCount++;

    if (this.state === "HALF_OPEN") {
      if (this.successCount >= this.successThreshold) {
        this.state = "CLOSED";
        this.successCount = 0;
        console.log(`🔄 Circuit breaker ${this.circuitId} closed after ${this.successThreshold} successes`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.recoveryTimeout;
      console.warn(`🚨 Circuit breaker ${this.circuitId} opened after ${this.failureCount} failures`);
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      circuitId: this.circuitId,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      successCount: this.successCount,
      successThreshold: this.successThreshold,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime,
      isAvailable: this.state === "CLOSED" || this.state === "HALF_OPEN",
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset() {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.state = "CLOSED";
    this.nextAttempt = 0;
  }
}

/**
 * Circuit breaker registry for managing multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private readonly breakers: Map<string, CircuitBreaker>;

  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create circuit breaker for a service
   * @param serviceName - Name of the service
   * @param options - Circuit breaker options
   * @returns Circuit breaker instance
   */
  getBreaker(serviceName: string, options: CircuitBreakerOptions = {}): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(
        serviceName,
        new CircuitBreaker({
          circuitId: serviceName,
          ...options,
        }),
      );
    }
    return this.breakers.get(serviceName)!;
  }

  /**
   * Get status of all circuit breakers
   * @returns {Object} Status of all circuit breakers
   */
  getAllStatus() {
    const status: Record<string, any> = {};
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Get statistics for all circuit breakers
   * @returns {Object} Statistics summary
   */
  getStats() {
    const stats: Record<string, number> = {
      total: this.breakers.size,
      open: 0,
      halfOpen: 0,
      closed: 0,
      unavailable: 0,
    };

    for (const breaker of this.breakers.values()) {
      const status = breaker.getStatus();
      const key = status.state.toLowerCase();
      stats[key] = (stats[key] || 0) + 1;
      if (!status.isAvailable) {
        stats['unavailable'] = (stats['unavailable'] || 0) + 1;
      }
    }

    return stats;
  }
}

/**
 * Global circuit breaker registry instance
 */
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Enhanced error classification for retry decisions
 * @param {Error} error - Error to classify
 * @returns {string} Error category
 */
export function classifyError(error: any) {
  const message = error.message?.toLowerCase() || "";
  const code = error.code?.toLowerCase() || "";
  const status = error.status || error.response?.status;

  // Network errors
  if (code === "enotfound" || code === "econnrefused" || message.includes("network")) {
    return "NETWORK";
  }

  // Timeout errors
  if (message.includes("timeout") || code === "etimedout") {
    return "TIMEOUT";
  }

  // Rate limiting
  if (status === 429 || message.includes("rate limit") || message.includes("quota")) {
    return "RATE_LIMIT";
  }

  // Authentication errors
  if (status === 401 || message.includes("unauthorized") || message.includes("authentication")) {
    return "AUTHENTICATION";
  }

  // Authorization errors
  if (status === 403 || message.includes("forbidden") || message.includes("authorization")) {
    return "AUTHORIZATION";
  }

  // Not found errors
  if (status === 404 || message.includes("not found")) {
    return "NOT_FOUND";
  }

  // Server errors (5xx)
  if (status >= 500 && status < 600) {
    return "SERVER_ERROR";
  }

  // Client errors (4xx except specific ones above)
  if (status >= 400 && status < 500) {
    return "CLIENT_ERROR";
  }

  // JSON parsing errors
  if (message.includes("json") && message.includes("parse")) {
    return "JSON_PARSE";
  }

  // Database errors
  if (message.includes("database") || message.includes("supabase") || message.includes("sql")) {
    return "DATABASE";
  }

  // AI service errors
  if (message.includes("openrouter") || message.includes("ai") || message.includes("gpt")) {
    return "AI_SERVICE";
  }

  return "UNKNOWN";
}

/**
 * Determine if error should fail fast (no retry)
 * @param {Error} error - Error to check
 * @returns {boolean} True if should fail fast
 */
function shouldFailFast(error: any) {
  const category = classifyError(error);

  // Don't retry these error types
  const failFastCategories = ["AUTHENTICATION", "AUTHORIZATION", "NOT_FOUND", "CLIENT_ERROR"];

  return failFastCategories.includes(category);
}

/**
 * Default retry strategy based on error classification
 * @param {Error} error - Error to evaluate
 * @returns {boolean} True if should retry
 */
export function defaultShouldRetry(error: unknown) {
  const category = classifyError(error);

  // Retry these categories
  const retryableCategories = ["NETWORK", "TIMEOUT", "RATE_LIMIT", "SERVER_ERROR", "DATABASE", "AI_SERVICE", "UNKNOWN"];

  return retryableCategories.includes(category);
}

/**
 * Create a resilient fetch function with retry and circuit breaker
 * @param {string} serviceName - Name of the service for circuit breaker
 * @param {Object} options - Fetch and retry options
 * @returns {Function} Enhanced fetch function
 */
export function createResilientFetch(serviceName: string, options: ResilientFetchOptions = {}) {
  const breaker = circuitBreakerRegistry.getBreaker(serviceName, options.circuitBreaker);

  return async (url: string, fetchOptions: Record<string, any> = {}) => {
    return breaker.execute(async () => {
      return withRetry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);

          try {
            const response = await fetch(url, {
              signal: controller.signal,
              headers: {
                "User-Agent": "SmartMatchBot/1.0 (+https://github.com/iamlegendary89-ux/smartmatch-pwa)",
                ...fetchOptions['headers'],
              },
              ...fetchOptions,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as any;
              error.status = response.status;
              throw error;
            }

            return response;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        },
        {
          maxRetries: options.maxRetries || 3,
          baseDelayMs: options.baseDelayMs || 1000,
          shouldRetry: options.shouldRetry || defaultShouldRetry,
          failFast: options.failFast || false,
          onRetry: (error, attempt, maxRetries, delay) => {
            const errorMessage = (error as any)?.message || String(error);
            console.warn(`🔄 ${serviceName} retry ${attempt}/${maxRetries} after ${delay}ms:`, errorMessage);
          },
          onError: (error, attempt, maxRetries) => {
            const errorMessage = (error as any)?.message || String(error);
            console.error(`❌ ${serviceName} error ${attempt}/${maxRetries}:`, errorMessage);
          },
        },
      );
    });
  };
}

/**
 * Simple sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Supabase-specific retry configuration
 */
const SUPABASE_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  backoffFactor: 2,
  shouldRetry: (error: any) => {
    const classification = classifyError(error);

    // Retry network, timeout, and server errors
    const retryableCategories = ["NETWORK", "TIMEOUT", "SERVER_ERROR", "DATABASE"];

    // Also retry specific Supabase error patterns
    const message = error.message?.toLowerCase() || "";
    const retryableMessages = [
      "connection",
      "timeout",
      "network",
      "temporary",
      "service temporarily unavailable",
      "pgrst301", // PostgREST timeout
    ];

    return retryableCategories.includes(classification) || retryableMessages.some((msg) => message.includes(msg));
  },
  failFast: false,
};

/**
 * Execute Supabase operation with retry logic
 * @param {Function} operation - Supabase operation function (e.g., () => supabase.from().upsert())
 * @param {Object} context - Context for error logging (phase, operation type, etc.)
 * @returns {Promise<any>} Result of the operation
 */
export async function withSupabaseRetry(operation: () => Promise<any>, context: SupabaseRetryContext = {}) {
  const { phase = "unknown", operationType = "database", phoneId = null } = context;

  return withRetry(
    async () => {
      try {
        return await operation();
      } catch (error: any) {
        // Enhance error with context before re-throwing
        error.context = {
          ...error.context,
          phase,
          operationType,
          phoneId,
          timestamp: new Date().toISOString(),
        };
        throw error;
      }
    },
    {
      ...SUPABASE_RETRY_OPTIONS,
      onRetry: (error, attempt, maxRetries, delay) => {
        const errorMessage = (error as any)?.message || String(error);
        console.warn(`🔄 ${phase} ${operationType} retry ${attempt}/${maxRetries} after ${delay}ms:`, errorMessage);
        if (phoneId) {
          console.warn(`   Affected phone: ${phoneId}`);
        }
      },
      onError: (error, attempt, maxRetries) => {
        const errorMessage = (error as any)?.message || String(error);
        console.error(`❌ ${phase} ${operationType} failed after ${maxRetries} attempts:`, errorMessage);
        if (phoneId) {
          console.error(`   Affected phone: ${phoneId}`);
        }

        // Log failed operation for post-analysis
        _logFailedOperation({
          phase,
          operationType,
          phoneId,
          error: errorMessage,
          attempts: attempt,
          timestamp: new Date().toISOString(),
        });
      },
    },
  );
}

/**
 * Log failed operation to data/failures.json
 * @param {Object} failure - Failure details
 */
async function _logFailedOperation(_failure: FailedOperationLog) {
  const FAILURES_FILE = "data/failures.json";

  try {
    const failures = await safeReadJson(FAILURES_FILE, {
      failed_upserts: [] as FailedOperationLog[],
      failed_deletes: [] as FailedOperationLog[],
      failed_operations: [] as FailedOperationLog[],
      last_updated: new Date().toISOString(),
    });

    // Add to appropriate category
    if (_failure.operationType === "upsert") {
      failures.failed_upserts.push(_failure);
    } else if (_failure.operationType === "delete") {
      failures.failed_deletes.push(_failure);
    } else {
      failures.failed_operations.push(_failure);
    }

    failures.last_updated = new Date().toISOString();

    await safeWriteJson(FAILURES_FILE, failures);

    console.log(`📝 Logged failed ${_failure.operationType} operation to ${FAILURES_FILE}`);
  } catch (__error: any) {
    console.error(`❌ Failed to log operation failure:`, __error.message);
    // Don't throw - logging failure shouldn't break the main operation
  }
}
