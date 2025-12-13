# Data Pipeline Documentation

Complete reference for the SmartMatch data processing pipeline.

---

## Pipeline Overview

```mermaid
flowchart LR
    D[Discovery] --> E[Enrichment]
    E --> O[OSET]
    O --> S[Sync]
    
    D -->|phones.json| E
    E -->|processed_content/| O
    O -->|Scores updated| S
    S -->|Upsert| DB[(Supabase)]
```

**Run full pipeline**:
```bash
npm run pipeline
```

**Run individual phases**:
```bash
npm run pipeline:discover
npm run pipeline:enrich
npm run pipeline:sync
```

---

## Phase 1: Discovery

**Script**: `scripts/discovery.ts`

**Purpose**: Collect review URLs from Google Custom Search Engine.

### Input
- `data/phones.json` (phone registry with brands/models)
- Google CSE API credentials

### Output
- Updated `data/phones.json` with CSE URLs per phone

### Configuration

```typescript
const TRUSTED_SOURCES = [
    "gsmarena.com",
    "androidauthority.com",
    "techradar.com",
    "tomsguide.com",
    "notebookcheck.net",
    "dxomark.com",
    "phonearena.com",
    "androidcentral.com"
];
```

### Workflow

1. Load phones from registry
2. For each phone without sufficient URLs:
   - Query CSE: `{brand} {model} review site:{source}`
   - Filter invalid patterns (forums, compare, deals)
   - Store up to 10 URLs per phone
3. Save atomically to `phones.json`

### Logs

```
[Discovery] Processing apple_iphone_15_pro
[Discovery] Found 8 URLs from GSMArena, Android Authority...
[Discovery] Saved to phones.json
```

---

## Phase 2: Enrichment

**Script**: `scripts/enrichment.ts`

**Purpose**: Scrape review content and generate AI summaries.

### Input
- `data/phones.json` (with URLs)
- Review HTML content (fetched)

### Output
- `data/processed_content/{phone_id}/{phone_id}.json`
- `data/processed_content/{phone_id}/hero_1.jpg` (if image found)

### AI Processing

Uses DeepSeek R1 or OpenRouter for content analysis:

```typescript
const SYSTEM_PROMPT = `
You are a smartphone analyst. Given review content, extract:
1. Brand, Model, Category
2. One-page summary (300 words max)
3. Top 5 pros and cons with citations
4. Scores for 7 attributes (1-10 scale)
5. Current and launch prices
6. Benchmark data (AnTuTu, Geekbench, DxOMark)
`;
```

### Output Schema

```typescript
interface EnrichmentOutput {
    phoneId: string;
    data: {
        brand: string;
        model: string;
        overallScore: number;
        category: string;
        onePageSummary: string;
        pros: string[];
        cons: string[];
        originalAttributes: {
            "Camera": { score: number, explanation: string },
            "Battery Endurance": { score: number, explanation: string },
            // ... 7 attributes total
        };
        currentPrice: { usd: string, eur?: string };
        launchPrice: { usd: string };
        antutu?: number;
        geekbench?: number;
        metadata: {
            confidence: number,
            sourceCount: number,
            // ...
        };
    };
}
```

### Rate Limiting

- DeepSeek: 5 requests/minute
- Batch size: 5 phones per run
- Cooldown: 60 seconds between batches

---

## Phase 3: OSET (Objective Scoring Evaluation Transform)

**Script**: `scripts/OSET.ts`

**Purpose**: Normalize scores and apply time-based decay.

### Input
- `data/processed_content/{phone_id}/{phone_id}.json` (all phones)

### Output
- Updated JSON files with `attributes` (normalized) alongside `originalAttributes`

### Algorithm

See [06-oset-algorithm.md](./06-oset-algorithm.md) for full details.

**Summary**:
1. Load all phones
2. Calculate min/max for each attribute
3. Normalize each score to 0-10 scale
4. Apply exponential decay based on phone age
5. Calculate weighted overall score
6. Write back to JSON files

---

## Phase 4: Sync

**Script**: `scripts/sync.ts`

**Purpose**: Upsert processed data to Supabase.

### Input
- `data/processed_content/{phone_id}/{phone_id}.json` (all phones)

### Output
- Upserted rows in `processed_phones` table
- Upserted rows in `dynamic_phones` table (post-OSET)

### Dual-State Strategy

```typescript
// processed_phones: Raw enrichment scores
const rawRow = buildDbRow(phone.originalAttributes, phone.originalOverallScore);

// dynamic_phones: Normalized + decayed scores
const dynamicRow = buildDbRow(phone.attributes, phone.overallScore);
```

### Field Mapping

| JSON Field | DB Column |
|------------|-----------|
| `phoneId` | `phone_id` |
| `data.brand` | `brand` |
| `data.model` | `model` |
| `data.overallScore` | `overall_score` |
| `data.attributes.Camera.score` | `camera_score` |
| `data.onePageSummary` | `summary` |
| `data.pros.join('\n')` | `pros` |
| `metadata.processedAt` | `last_processed_at` |
| `metadata.processingVersion` | `facts_version` |
| Full JSON | `full_data` |

---

## File Formats

### phones.json

```json
{
  "brands": {
    "apple": {
      "iphone_15_pro": {
        "model": "iPhone 15 Pro",
        "releaseDate": "2023-09-22",
        "cse": {
          "gsmarena": "https://gsmarena.com/apple_iphone_15_pro-12345.php",
          "androidauthority": "https://androidauthority.com/iphone-15-pro-review/"
        }
      }
    }
  }
}
```

### processed_content/{phone_id}.json

```json
{
  "phoneId": "apple_iphone_15_pro",
  "data": {
    "brand": "apple",
    "model": "iPhone 15 Pro",
    "overallScore": 8.45,
    "category": "flagship",
    "onePageSummary": "The iPhone 15 Pro...",
    "pros": ["Excellent cameras", "Great performance"],
    "cons": ["Battery could be better"],
    "originalAttributes": { ... },
    "attributes": { ... },
    "currentPrice": { "usd": "$999" },
    "metadata": { ... }
  }
}
```

### regret-sentiments.json

```json
{
  "_meta": { "version": "1.0", "attributes": [...] },
  "regretData": {
    "apple_iphone_15_pro": {
      "totalRegretScore": 6.2,
      "attributes": {
        "Battery Endurance": {
          "regretScore": 8,
          "frequency": "very_high",
          "topComplaints": ["Slow charging", "Degradation"]
        }
      }
    }
  }
}
```

---

## Logging

All phases log to:
- Console (real-time with `ora` spinners)
- `log_discovery.txt`
- `log_enrichment.txt`
- `log_oset.txt`
- `log_sync.txt`

### Log Levels

```typescript
logger.info("Processing phone...");
logger.warn("Missing URL for phone");
logger.error("API call failed", error);
```

---

## Error Recovery

### Atomic Writes

All file operations use atomic writes:
```typescript
// Write to temp file first
await writeFile(`${path}.tmp`, content);
// Rename atomically
await rename(`${path}.tmp`, path);
```

### Retry Logic

API calls use exponential backoff:
```typescript
const retry = require('lib/retry');

const result = await retry({
    attempts: 3,
    delayMs: 1000,
    backoff: 2.0,
    fn: () => callDeepSeek(prompt)
});
```

### Partial Failure

If enrichment fails for one phone:
1. Log error with phone ID
2. Skip to next phone
3. Continue pipeline
4. Report failed phones in summary
