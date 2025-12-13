import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TelemetryOptions {
  serviceName: string;
  serviceVersion: string;
  environment?: string;
  otlpEndpoint?: string; // Ignored in this lightweight version
  consoleExporter?: boolean; // Ignored, always logs to console
}

interface Span {
  name: string;
  startTime: number;
  attributes?: Record<string, any>;
}

// -----------------------------------------------------------------------------
// State & Storage
// -----------------------------------------------------------------------------

const asyncStorage = new AsyncLocalStorage<string[]>(); // Store stack of span names for indentation
const metrics = {
  counters: new Map<string, number>(),
  histograms: new Map<string, number[]>(),
};

// -----------------------------------------------------------------------------
// API
// -----------------------------------------------------------------------------

export async function initializeTelemetry(options: TelemetryOptions): Promise<void> {
  console.log(`\n📡 [Telemetry] Initialized for ${options.serviceName} (${options.environment})`);
}

export async function shutdownTelemetry(): Promise<void> {
  console.log('\n📊 [Telemetry] Session Summary:');
  console.log('----------------------------------------');

  // Sort counters for readability
  const sortedCounters = Array.from(metrics.counters.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  if (sortedCounters.length > 0) {
    console.log('Counters:');
    for (const [key, value] of sortedCounters) {
      console.log(`  ${key.padEnd(40)} : ${value}`);
    }
  }

  // Sort histograms
  const sortedHistograms = Array.from(metrics.histograms.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  if (sortedHistograms.length > 0) {
    console.log('\nHistograms (Avg / Max):');
    for (const [key, values] of sortedHistograms) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      console.log(`  ${key.padEnd(40)} : ${avg.toFixed(2)}ms / ${max.toFixed(2)}ms`);
    }
  }
  console.log('----------------------------------------\n');
}

export function startSpan(name: string, options?: { kind?: string; attributes?: Record<string, any> }): Span {
  const currentStack = asyncStorage.getStore() || [];
  const indent = '  '.repeat(currentStack.length);

  // Only log top-level or significant milestones to avoid noise, or log all if deep debugging needed.
  // For now, we log everything nicely indented.
  console.log(`${indent}➡️  Starting: ${name}`);

  return {
    name,
    startTime: performance.now(),
    ...(options?.attributes ? { attributes: options.attributes } : {})
  };
}

export function endSpan(span: Span, status: 'success' | 'failure' | 'timeout' = 'success', error?: Error): void {
  const duration = performance.now() - span.startTime;
  const currentStack = asyncStorage.getStore() || [];
  const indent = '  '.repeat(Math.max(0, currentStack.length - 1)); // -1 because we might be technically out of the stack conceptually

  if (status === 'failure' || status === 'timeout') {
    console.error(`${indent}❌ Failed: ${span.name} (${duration.toFixed(2)}ms) - ${error?.message || 'Unknown error'}`);
  } else {
    console.log(`${indent}✅ Completed: ${span.name} (${duration.toFixed(2)}ms)`);
  }
}

// Wrapper to automatically handle context context propagation
export function withSpanContext<T>(span: Span, fn: () => T): T {
  const currentStack = asyncStorage.getStore() || [];
  return asyncStorage.run([...currentStack, span.name], fn);
}

// NOTE: Since sync.ts doesn't strictly use `withSpanContext` for everything (it uses manual start/end),
// the indentation might be flat if not wrapped. 
// To make `startSpan` automatically infer parent, we would need to always run inside a context.
// However, to keep this "simple" and compatible with existing `sync.ts` which just calls `startSpan`, 
// we will just use the global indentation if we can, but `sync.ts` architecture is manual.
// 
// CORRECTION: `sync.ts` calls `startSpan` -> `endSpan`. It doesn't use a closure wrapper for everything.
// To get nice indentation without refactoring `sync.ts`, we can't easily use AsyncLocalStorage 
// UNLESS `sync.ts` was using `traceAsyncFunction`.
// 
// Seeing `sync.ts` uses: `const span = startSpan(...) ... endSpan(span)` inline.
// This means there is no callback to wrap in `asyncStorage.run`.
// 
// STRICT COMPATIBILITY MODE:
// We will mock the indentation logic or just keep it flat/simple logs to avoid "broken promises" on indentation 
// if the code structure doesn't support it.
// 
// ACTUALLY: We can just return the span. The "Indentation" feature usually requires a closure. 
// Let's stick to clean linear logs with meaningful prefixes.

// -----------------------------------------------------------------------------
// Metrics Helpers
// -----------------------------------------------------------------------------

function incrementCounter(name: string, value: number = 1) {
  const current = metrics.counters.get(name) || 0;
  metrics.counters.set(name, current + value);
}

function recordHistogram(name: string, value: number) {
  const current = metrics.histograms.get(name) || [];
  current.push(value);
  metrics.histograms.set(name, current);
}

export function recordWorkflowRun(_workflowName: string, durationMs: number, status: 'success' | 'failure' | 'timeout'): void {
  incrementCounter(`workflow.run.${status}`);
  recordHistogram('workflow.run.duration', durationMs);
}

export function recordWorkflowStep(
  _workflowName: string,
  stepName: string,
  durationMs: number,
  status: 'success' | 'failure' | 'timeout'
): void {
  incrementCounter(`step.${stepName}.${status}`);
  recordHistogram(`step.${stepName}.duration`, durationMs);
}

export function recordDbUpsert(_workflowName: string, tableName: string, count: number, durationMs: number): void {
  incrementCounter(`db.upsert.count.${tableName}`, count);
  recordHistogram(`db.upsert.duration.${tableName}`, durationMs);
}

export function recordImageUpload(_workflowName: string, _phoneId: string, sizeBytes: number): void {
  incrementCounter('image.upload.count');
  recordHistogram('image.upload.size', sizeBytes);
}

// -----------------------------------------------------------------------------
// Stubs (Compat with existing calls)
// -----------------------------------------------------------------------------

export function traceAsyncFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  spanName: string,
  options?: any
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const span = startSpan(spanName, options);
    try {
      const result = await fn.apply(this, args);
      endSpan(span, 'success');
      return result;
    } catch (error) {
      endSpan(span, 'failure', error as Error);
      throw error;
    }
  };
}

export function getActiveSpan() { return undefined; }
export function recordRetry() { incrementCounter('workflow.retry'); }
