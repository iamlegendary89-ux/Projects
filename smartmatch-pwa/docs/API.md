# SmartMatch PWA - API Reference

## Overview

This document covers the main exported functions and utilities from the SmartMatch codebase.

---

## Retry Utilities (`lib/retry.ts`)

### `withRetry<T>(fn, options): Promise<T>`

Execute a function with automatic retry logic and exponential backoff.

```typescript
import { withRetry } from "@/lib/retry";

const result = await withRetry(
  () => fetch("https://api.example.com/data"),
  {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffFactor: 2,
    shouldRetry: (error) => error.status !== 404,
    onRetry: (error, attempt, maxRetries, delay) => {
      console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms`);
    },
  }
);
```

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxRetries` | `number` | 3 | Maximum retry attempts |
| `baseDelayMs` | `number` | 1000 | Initial delay between retries |
| `maxDelayMs` | `number` | 30000 | Maximum delay cap |
| `backoffFactor` | `number` | 2 | Exponential multiplier |
| `shouldRetry` | `(error) => boolean` | `() => true` | Determine if error is retryable |
| `onRetry` | `callback` | - | Called on each retry |
| `failFast` | `boolean` | false | Skip retries for auth/404 errors |

---

### `CircuitBreaker`

Fault tolerance pattern to prevent cascade failures.

```typescript
import { CircuitBreaker } from "@/lib/retry";

const breaker = new CircuitBreaker({
  failureThreshold: 5,    // Open after 5 failures
  recoveryTimeout: 60000, // Try again after 1 minute
  successThreshold: 2,    // Close after 2 successes
});

// Execute with circuit breaker protection
const result = await breaker.execute(() => riskyOperation());

// Check status
const status = breaker.getStatus();
// { state: "CLOSED", failureCount: 0, isAvailable: true, ... }

// Reset manually
breaker.reset();
```

**States:**
- `CLOSED`: Normal operation, requests pass through
- `OPEN`: Circuit tripped, requests fail immediately
- `HALF_OPEN`: Testing recovery, limited requests allowed

---

### `classifyError(error): string`

Classify an error for retry decisions.

```typescript
import { classifyError } from "@/lib/retry";

const category = classifyError(error);
// Returns: "NETWORK" | "TIMEOUT" | "RATE_LIMIT" | "AUTHENTICATION" | 
//          "AUTHORIZATION" | "NOT_FOUND" | "SERVER_ERROR" | "CLIENT_ERROR" |
//          "JSON_PARSE" | "DATABASE" | "AI_SERVICE" | "UNKNOWN"
```

---

### `defaultShouldRetry(error): boolean`

Default retry strategy based on error classification.

```typescript
import { defaultShouldRetry } from "@/lib/retry";

// Retryable: NETWORK, TIMEOUT, RATE_LIMIT, SERVER_ERROR, DATABASE, AI_SERVICE, UNKNOWN
// Non-retryable: AUTHENTICATION, AUTHORIZATION, NOT_FOUND, CLIENT_ERROR

const shouldRetry = defaultShouldRetry(error);
```

---

## Error Handling (`lib/errors.ts`)

### `PipelineError`

Structured error class for pipeline operations.

```typescript
import { PipelineError, ERROR_CATEGORY, ERROR_SEVERITY } from "@/lib/errors";

throw new PipelineError("API quota exceeded", {
  phase: "discovery",
  category: ERROR_CATEGORY.QUOTA,
  severity: ERROR_SEVERITY.HIGH,
  retryable: true,
  context: { phoneId: "apple-iphone-15" },
  suggestedRecovery: "Wait 1 hour for quota reset",
});
```

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `phase` | `string` | Pipeline phase (discovery, enrichment, sync) |
| `category` | `ERROR_CATEGORY` | Error classification |
| `severity` | `ERROR_SEVERITY` | low, medium, high, critical |
| `retryable` | `boolean` | Whether operation can be retried |
| `context` | `object` | Additional error context |
| `suggestedRecovery` | `string` | Recovery instructions |
| `timestamp` | `string` | ISO timestamp |

---

### Phase-Specific Errors

```typescript
import { DiscoveryError, EnrichmentError, SyncError } from "@/lib/errors";

throw new DiscoveryError("CSE quota exceeded");
throw new EnrichmentError("AI model unavailable");
throw new SyncError("Database connection failed");
```

---

### `ErrorHandler`

Aggregate and summarize errors from a pipeline run.

```typescript
import { ErrorHandler } from "@/lib/errors";

const handler = new ErrorHandler("run-id-123");

try {
  await riskyOperation();
} catch (error) {
  handler.handle(error, { phase: "discovery" });
}

// Check for critical errors
if (handler.hasCriticalErrors()) {
  process.exit(1);
}

// Get summary
const summary = handler.getSummary();
// { total: 5, byPhase: {...}, byCategory: {...}, critical: 1, retryable: 3 }

// Print table
console.log(handler.generateSummaryTable());

// Export to file
await handler.exportToFile("logs/errors.json");

// Get exit code (0=success, 1=critical, 2=non-critical errors)
process.exit(handler.getExitCode());
```

---

## File I/O (`lib/io.ts`)

### `safeReadJson<T>(path, defaultValue): Promise<T>`

Read JSON file with fallback default.

```typescript
import { safeReadJson } from "@/lib/io";

const data = await safeReadJson("data/phones.json", { brands: {} });
```

---

### `safeWriteJson(path, data): Promise<void>`

Atomically write JSON file (write temp, then rename).

```typescript
import { safeWriteJson } from "@/lib/io";

await safeWriteJson("data/phones.json", phoneData);
```

---

## SmartMatch Engine (`src/lib/SmartMatch.ts`)

### `SmartMatch(preferences, phones): Promise<SmartMatchResult[]>`

Main recommendation engine.

```typescript
import { SmartMatch } from "@/lib/SmartMatch";

const results = await SmartMatch(
  {
    priorities: {
      camera: 9,
      battery: 8,
      performance: 7,
    },
    maxBudget: 1000,
    ecosystem: "iOS",
  },
  phonesData
);

// Returns sorted array of SmartMatchResult
// Top result includes: phoneId, brand, model, finalScore, archetype, 
// empathy_sentence, skeptic_shield, why_matched, destiny_override, etc.
```

---

## Pipeline Scripts

### Discovery
```bash
npm run pipeline:discover
# or
npx tsx scripts/discovery.ts
```

### Enrichment
```bash
npm run pipeline:enrich
# or
npx tsx scripts/enrichment.ts
```

### Full Pipeline
```bash
npm run pipeline
# or
npx tsx scripts/pipeline.ts
```

### Sync to Database
```bash
npm run pipeline:sync
# or
npx tsx scripts/sync.ts --export
```

---

## Environment Variables

See `.env.example` for full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | AI API access |
| `GOOGLE_CSE_API_KEY` | Yes | Search API |
| `GOOGLE_CSE_ID` | Yes | Search engine ID |
| `SUPABASE_URL` | Yes | Database URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Database key |
