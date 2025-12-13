# SmartMatch Scripts

Main scripts for phone data discovery and AI-powered enrichment.

## Discovery (`discovery_v6.ts`)

Discovers phone URLs from multiple sources for content scraping.

```bash
npx tsx scripts/discovery_v6.ts [brand] [model]
```

**Features:**
- Google Custom Search Engine (CSE) integration
- Wayback Machine archive discovery
- Multi-source content scraping (GSMArena, PhoneArena, etc.)
- Failure caching with exponential backoff
- Release date extraction

## Enrichment (`enrichment_v7.ts`)

AI-powered phone review generation using OpenRouter API.

```bash
npx tsx scripts/enrichment_v7.ts [brand] [model]
```

**Features:**
- Batch processing of scraped content
- 7-attribute scoring system (Camera, Performance, Display, Battery, Software, Design, Longevity)
- Brand-specific weight adjustments
- Automatic categorization (flagship/premium/midrange/budget)
- JSON Schema validation

## Sync (`sync.ts`)

Database synchronization utility (for future use).

## Configuration

Required environment variables in `.env.local`:
```
OPENROUTER_API_KEY=your_key
GOOGLE_CSE_ID=your_cse_id
GOOGLE_CSE_API_KEY=your_api_key
```
