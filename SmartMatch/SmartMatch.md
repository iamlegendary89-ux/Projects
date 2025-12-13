# SmartMatch PWA Documentation

Welcome to the comprehensive documentation for the SmartMatch PWA - an AI-powered smartphone recommendation engine.

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./01-architecture.md) | System overview, data flow, tech stack |
| [Component Library](./02-components.md) | All UI components with props and usage |
| [Developer Guide](./03-developer-guide.md) | Setup, environment, development workflow |
| [API Reference](./04-api-reference.md) | Server actions and API routes |
| [Data Pipeline](./05-data-pipeline.md) | Discovery → Enrichment → OSET → Sync |
| [OSET Algorithm](./06-oset-algorithm.md) | Scoring system and formulas |
| [Database Schema](./07-database.md) | Tables, relationships, migrations |
| [Deployment](./08-deployment.md) | Vercel, CI/CD, production setup |

## Quick Links

- **Source Code**: `d:\Projects\smartmatch-pwa`
- **Framework**: Next.js 16 + React 19
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS + Framer Motion

## Project Overview

SmartMatch is a Progressive Web Application that helps users find their perfect smartphone through:

1. **AI-Powered Quiz** - Adaptive questioning to understand user preferences
2. **OSET Scoring** - 7-attribute scoring system with real-time normalization
3. **Regret Analysis** - User sentiment aggregation from Reddit, XDA, YouTube
4. **Rankings** - Sortable leaderboard with hero images

---

*Generated: December 13, 2025*
# Architecture Documentation

## System Overview

SmartMatch PWA is a full-stack Next.js application with a sophisticated data pipeline for processing smartphone reviews and generating AI-powered recommendations.

```mermaid
flowchart TB
    subgraph DataSources["External Data Sources"]
        GSM[GSMArena]
        CSE[Google CSE]
        Reviews[Tech Reviews]
    end
    
    subgraph Pipeline["Data Pipeline"]
        Discovery["Discovery\n(scripts/discovery.ts)"]
        Enrichment["Enrichment\n(scripts/enrichment.ts)"]
        OSET["OSET Scoring\n(scripts/OSET.ts)"]
        Sync["Database Sync\n(scripts/sync.ts)"]
    end
    
    subgraph Storage["Data Storage"]
        JSON["JSON Files\n(data/processed_content/)"]
        Supabase["Supabase\n(PostgreSQL)"]
    end
    
    subgraph Frontend["Next.js Frontend"]
        Quiz[Adaptive Quiz]
        Rankings[Rankings Page]
        Details[Phone Details]
    end
    
    DataSources --> Discovery
    Discovery --> Enrichment
    Enrichment --> JSON
    JSON --> OSET
    OSET --> Sync
    Sync --> Supabase
    Supabase --> Frontend
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.7 | React framework with App Router |
| React | 19.2.3 | UI library |
| Framer Motion | 12.23.25 | Animation library |
| Tailwind CSS | 3.4.17 | Utility-first CSS |
| Lucide React | 0.424.0 | Icon library |
| Three.js | 0.181.2 | 3D graphics (backgrounds) |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Drizzle ORM | 0.45.1 | TypeScript ORM |
| PostgreSQL | - | Database (via Supabase) |
| Supabase | 2.38.0 | Backend-as-a-Service |
| Zod | 4.1.12 | Schema validation |

### Data Pipeline
| Technology | Version | Purpose |
|------------|---------|---------|
| Cheerio | 1.1.2 | HTML parsing |
| Axios | 1.13.1 | HTTP client |
| Winston | 3.18.3 | Logging |

---

## Directory Structure

```
smartmatch-pwa/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   └── phone-image/    # Image serving API
│   ├── onyx/               # Main application routes
│   │   ├── details/        # Phone details page
│   │   ├── phone/[slug]/   # Dynamic phone pages
│   │   └── rankings/       # Rankings page
│   ├── globals.css         # Global styles
│   └── layout.tsx          # Root layout
│
├── components/             
│   └── onyx-ui/          # All UI components
│       ├── screens/        # Full-screen components
│       └── *.tsx           # Reusable components
│
├── lib/                    # Shared libraries
│   ├── db/                 # Database (Drizzle schema)
│   ├── onyx/               # Server actions
│   └── auth/               # Authentication (planned)
│
├── hooks/                  # React hooks
│   ├── use-reduced-motion.ts
│   └── use-high-contrast.ts
│
├── scripts/                # Data pipeline scripts
│   ├── discovery.ts        # URL discovery
│   ├── enrichment.ts       # AI content generation
│   ├── OSET.ts             # Scoring algorithm
│   ├── sync.ts             # Database sync
│   └── pipeline.ts         # Orchestrator
│
├── data/                   # Data storage
│   ├── phones.json         # Master phone registry
│   ├── processed_content/  # Per-phone JSON + images
│   └── regret-sentiments.json  # User regret data
│
└── tests/                  # Test suites
```

---

## Data Flow

### 1. Discovery Phase
```
Google CSE → URLs → phones.json
```
- Collects review URLs from trusted sources
- Maps URLs to phone identifiers
- Stores in `data/phones.json`

### 2. Enrichment Phase
```
URLs → Scrape → AI Processing → processed_content/
```
- Scrapes content from each URL
- Sends to DeepSeek AI for analysis
- Generates structured JSON with scores

### 3. OSET Phase
```
Raw Scores → Normalization → Decay → Final Scores
```
- Normalizes scores across all phones (0-10)
- Applies time-based decay for older phones
- Calculates overall weighted score

### 4. Sync Phase
```
processed_content/ → Drizzle → Supabase
```
- Reads JSON files
- Transforms to database schema
- Upserts to `processed_phones` table

---

## Key Design Decisions

### 1. Static-First Architecture
All phone data is pre-processed and stored in the database. The frontend reads from Postgres, avoiding runtime AI calls.

### 2. Dual-State Data
- `processed_phones`: Raw scores from enrichment
- `dynamic_phones`: Post-OSET normalized scores

### 3. File-Based Cache
JSON files in `data/processed_content/` serve as:
- Source of truth before sync
- Backup for rollback
- Development fixtures

### 4. Server Actions
All data fetching uses Next.js Server Actions in `lib/onyx/actions.ts` for type-safe, cached queries.
# Component Library

Complete reference for all UI components in `components/onyx-ui/`.

---

## Core Components

### HoloCard

Glassmorphism card with holographic hover effects.

**Location**: `components/onyx-ui/HoloCard.tsx`

**Props**:
```typescript
interface HoloCardProps {
    children: React.ReactNode;
    className?: string;
    intensity?: "low" | "medium" | "high";  // Holographic intensity
    isActive?: boolean;                      // Active state styling
    noPadding?: boolean;                     // Remove default padding
}
```

**Usage**:
```tsx
<HoloCard intensity="high" isActive={true}>
    <h3>Phone Name</h3>
    <p>Score: 8.5</p>
</HoloCard>
```

---

### PhoneImage

Displays phone hero images with fallback.

**Location**: `components/onyx-ui/PhoneImage.tsx`

**Props**:
```typescript
interface PhoneImageProps {
    phoneId: string;          // e.g., "apple_iphone_15_pro"
    alt?: string;
    className?: string;
    width?: number;           // Default: 200
    height?: number;          // Default: 200
    priority?: boolean;       // Next.js Image priority
}
```

**Usage**:
```tsx
<PhoneImage 
    phoneId="oneplus_13" 
    alt="OnePlus 13"
    width={96}
    height={144}
/>
```

**Fallback Behavior**: Shows gradient placeholder with phone name if image not found.

---

### ShareButton

Web Share API with social link fallback.

**Location**: `components/onyx-ui/ShareButton.tsx`

**Props**:
```typescript
interface ShareButtonProps {
    title: string;            // Share title
    text?: string;            // Share body text
    url?: string;             // URL to share (defaults to current page)
    variant?: "icon" | "full"; // Display variant
    className?: string;
}
```

**Usage**:
```tsx
<ShareButton 
    title="iPhone 15 Pro Analysis"
    text="Check out this OSET score!"
    variant="icon"
/>
```

**Features**:
- Native Web Share API on supported devices
- Dropdown with Copy Link, Twitter, Facebook, LinkedIn
- Animated transitions

---

### FeedbackButtons

Upvote and report functionality.

**Location**: `components/onyx-ui/FeedbackButtons.tsx`

**Props**:
```typescript
interface FeedbackButtonsProps {
    phoneId: string;
    initialUpvotes?: number;
}
```

**Usage**:
```tsx
<FeedbackButtons phoneId="samsung_galaxy_s25" initialUpvotes={42} />
```

**Features**:
- Optimistic upvote count update
- Report modal with 5 categories:
  - Wrong Score
  - Wrong Specification
  - Outdated Information
  - Missing Information
  - Other
- Persists to `feedbacks` table

---

### RegretMeter

Visualizes common user regrets.

**Location**: `components/onyx-ui/RegretMeter.tsx`

**Props**:
```typescript
interface RegretMeterProps {
    phoneId: string;
    regretData?: PhoneRegretData;
}

interface PhoneRegretData {
    phoneId: string;
    totalRegretScore: number;  // 1-10
    attributes: Record<string, AttributeRegret>;
}

interface AttributeRegret {
    regretScore: number;
    frequency: "very_high" | "high" | "medium" | "low";
    topComplaints: string[];
}
```

**Usage**:
```tsx
<RegretMeter phoneId="apple_iphone_15_pro" regretData={regretData} />
```

**Features**:
- Animated gauge with Low/Moderate/High levels
- Top 3 regret categories with complaints
- Frequency indicators with color coding

---

### AccessibilitySettings

Floating accessibility panel.

**Location**: `components/onyx-ui/AccessibilitySettings.tsx`

**Features**:
- Reduced motion toggle (respects `prefers-reduced-motion`)
- High contrast toggle (adds `.high-contrast` class to `<html>`)
- Persists preferences to localStorage

**Usage**:
```tsx
// Add to layout or page
<AccessibilitySettings />
```

---

## Background Components

### StaticBackground

Subtle gradient background with particles.

**Location**: `components/onyx-ui/StaticBackground.tsx`

**Props**:
```typescript
interface StaticBackgroundProps {
    primaryColor?: string;    // Default: "#ffffff"
}
```

---

### ParticleField

Three.js particle system.

**Location**: `components/onyx-ui/ParticleField.tsx`

**Props**:
```typescript
interface ParticleFieldProps {
    particleCount?: number;   // Default: 100
    color?: "light" | "dark";
}
```

---

### LivingBackground

Animated fluid background (deprecated in favor of StaticBackground).

**Location**: `components/onyx-ui/LivingBackground.tsx`

---

## Screen Components

Located in `components/onyx-ui/screens/`:

| Component | Description |
|-----------|-------------|
| `IdentityReveal.tsx` | Post-quiz archetype reveal animation |
| `AdaptiveQuiz.tsx` | Quiz question flow |
| `OnyxOrchestrator.tsx` | Main quiz orchestrator |

---

## Form Components

### Button

**Location**: `components/onyx-ui/Button.tsx`

**Variants**: primary, secondary, ghost, outline

### Input

**Location**: `components/onyx-ui/Input.tsx`

---

## Design Tokens

All design tokens are defined in `app/globals.css`:

```css
:root {
    --onyx-primary: #00D4FF;
    --void-black: #1A1A2E;
    --pure-light: #F5F5F5;
    --accent-indigo: #4D4DFF;
    --accent-violet: #C07CFF;
    --glass-border: rgba(255, 255, 255, 0.15);
}
```

### Archetype Colors

```css
--visionary: #00D4FF;
--endurance: #FF4D4D;
--investor: #00FF94;
--purist: #FFFFFF;
--longevity: #FFD700;
--devotee: #FF69B4;
--curator: #9370DB;
--connoisseur: #8A2BE2;
--disciplinarian: #708090;
--efficiency: #4682B4;
--creator: #FF8C00;
--realist: #A9A9A9;
```
# Developer Guide

Complete setup and development workflow for SmartMatch PWA.

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 8.0.0 |
| Git | Latest |

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/iamlegendary89-ux/smartmatch-pwa.git
cd smartmatch-pwa

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Create `.env.local` with these variables:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# Google Custom Search Engine
CSE_API_KEY=your_google_api_key
CSE_ENGINE_ID=your_search_engine_id

# DeepSeek AI (for enrichment)
DEEPSEEK_API_KEY=sk-xxx

# OpenRouter (alternative AI)
OPENROUTER_API_KEY=sk-or-xxx

# Supabase (optional, for auth)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Worker (Cloudflare)
WORKER_URL=https://your-worker.workers.dev
API_SECRET=your_api_secret
```

---

## NPM Scripts Reference

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build (with lint + typecheck) |
| `npm run start` | Run production server |

### Quality Assurance

| Command | Description |
|---------|-------------|
| `npm run qa:lint` | ESLint check |
| `npm run qa:lint:fix` | ESLint auto-fix |
| `npm run qa:type-check` | TypeScript check |
| `npm run qa:format` | Prettier format |
| `npm run quality` | Run all QA checks |

### Testing

| Command | Description |
|---------|-------------|
| `npm run test:unit` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:performance` | Run performance tests |
| `npm run test:coverage` | Generate coverage report |

### Data Pipeline

| Command | Description |
|---------|-------------|
| `npm run pipeline` | Run full pipeline |
| `npm run pipeline:discover` | Discovery phase only |
| `npm run pipeline:enrich` | Enrichment phase only |
| `npm run pipeline:sync` | Database sync only |
| `npm run pipeline:full` | Pipeline + git commit + push |

### Database

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:reset` | Reset database (DESTRUCTIVE) |
| `npm run db:studio` | Open Drizzle Studio |

---

## Project Configuration

### TypeScript (`tsconfig.json`)

Key settings:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

Path aliases:
- `@/*` → `./app/*`
- `@/components/*` → `./components/*`
- `@/lib/*` → `./lib/*`
- `@/hooks/*` → `./hooks/*`

### ESLint (`eslint.config.mjs`)

- TypeScript-ESLint rules enabled
- Prettier integration
- React Hooks linting

### Tailwind (`tailwind.config.js`)

Custom theme extensions in `tailwind.config.js`.

---

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes...

# Pre-commit runs automatically (lint + typecheck)
git add .
git commit -m "feat: my feature"

# Push and create PR
git push origin feature/my-feature
```

### 2. Running Pipeline

```bash
# Full pipeline (discover → enrich → OSET → sync)
npm run pipeline

# Only sync existing data to database
npm run pipeline:sync

# With image processing disabled
npm run pipeline:sync:no-images
```

### 3. Database Development

```bash
# Make schema changes in lib/db/schema.ts

# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate

# View data in studio
npm run db:studio
```

---

## Pre-commit Hooks

Husky runs these checks before each commit:

1. **ESLint** - Lints `scripts/*.ts`
2. **TypeScript** - Type checks entire project
3. **Commit Message** - Validates format

Commit message format: `type: description`

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`

---

## Debugging

### Next.js

```bash
# Enable debug mode
DEBUG=* npm run dev
```

### Database Queries

```typescript
// In lib/db/index.ts, add logging:
import { drizzle } from 'drizzle-orm/postgres-js';
import { logger } from 'drizzle-orm';

export const db = drizzle(client, { logger: true });
```

### Pipeline Scripts

All pipeline scripts log to:
- Console (real-time)
- `log_discovery.txt`
- `log_enrichment.txt`
- `log_oset.txt`
- `log_sync.txt`

---

## Common Issues

### "Module not found: @/hooks/*"

Ensure `hooks/` is in tsconfig include:
```json
"include": ["hooks/**/*.ts"]
```

### Database connection error

1. Check `DATABASE_URL` in `.env.local`
2. Verify Supabase is running
3. Run `npm run db:migrate`

### Pre-commit hook fails

```bash
# Skip hooks temporarily
git commit --no-verify -m "wip"
```

---

## IDE Setup

### VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Importer
- Prisma (for schema highlighting)

### Recommended Settings

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```
# API Reference

Complete reference for all server actions and API routes.

---

## Server Actions

Located in `lib/onyx/`.

### actions.ts

Main data fetching actions.

#### `getRankings()`

Fetch all phones for rankings page.

```typescript
export async function getRankings(): Promise<PhoneRanking[]>

interface PhoneRanking {
    id: string;
    name: string;
    brand: string;
    score: number;
    category: string;
    releaseDate: Date;
    camera_score: number;
    battery_score: number;
    performance_score: number;
    software_score: number;
    design_score: number;
    display_score: number;
    longevity_score: number;
}
```

**Usage**:
```typescript
const rankings = await getRankings();
```

---

#### `getPhoneDetails(phoneId: string)`

Fetch single phone details.

```typescript
export async function getPhoneDetails(phoneId: string): Promise<ProcessedPhone | null>

// Returns full row from processed_phones table
// Includes full_data JSONB with complete enrichment data
```

**Usage**:
```typescript
const phone = await getPhoneDetails("apple_iphone_15_pro");
const phoneData = phone?.full_data;
```

---

### feedback-actions.ts

User feedback functionality.

#### `submitUpvote(phoneId: string)`

```typescript
interface UpvoteResult {
    success: boolean;
    newCount?: number;
    error?: string;
}

export async function submitUpvote(phoneId: string): Promise<UpvoteResult>
```

#### `getUpvoteCount(phoneId: string)`

```typescript
export async function getUpvoteCount(phoneId: string): Promise<number>
```

#### `submitReport(phoneId, category, description)`

```typescript
type ReportCategory = 
    | "wrong_score" 
    | "wrong_spec" 
    | "outdated_info" 
    | "missing_info" 
    | "other";

interface ReportResult {
    success: boolean;
    error?: string;
}

export async function submitReport(
    phoneId: string,
    category: ReportCategory,
    description: string
): Promise<ReportResult>
```

---

### regret-actions.ts

Regret sentiment data.

#### `getRegretData(phoneId: string)`

```typescript
interface AttributeRegret {
    regretScore: number;
    frequency: "very_high" | "high" | "medium" | "low";
    topComplaints: string[];
}

interface PhoneRegretData {
    phoneId: string;
    totalRegretScore: number;
    attributes: Record<string, AttributeRegret>;
}

export async function getRegretData(phoneId: string): Promise<PhoneRegretData | null>
```

**Data Source**: `data/regret-sentiments.json`

---

## API Routes

### GET `/api/phone-image/[phoneId]`

Serve phone hero images.

**Location**: `app/api/phone-image/[phoneId]/route.ts`

**Request**:
```
GET /api/phone-image/oneplus_13
```

**Response**:
- **200**: JPEG image with 1-year cache
- **404**: Image not found

**Image Locations Searched**:
1. `data/content/[phoneId]/hero_1.jpg`
2. `data/processed_content/[phoneId]/hero_1.jpg`

---

## Data Types

### PhoneData (Full Enrichment)

```typescript
interface PhoneData {
    brand: string;
    model: string;
    category: "flagship" | "premium" | "upper_midrange" | "midrange" | "budget";
    overallScore: number;
    tagline?: string;
    onePageSummary: string;
    pros: string[];
    cons: string[];
    attributes: Record<string, AttributeScore>;
    originalAttributes?: Record<string, AttributeScore>;
    currentPrice?: {
        usd: string;
        eur?: string;
        inr?: string;
        gbp?: string;
    };
    launchPrice?: {
        usd: string;
    };
    antutu?: number;
    geekbench?: number;
    dxocamera?: number;
    dxodisplay?: number;
    batteryActiveUse?: number;
    metadata: {
        confidence: number;
        modelUsed: string;
        processingVersion: string;
        processedAt: string;
        processingTimeMs: number;
        sourceCount: number;
        sourceNames: string[];
        sourceUrls: string[];
    };
}

interface AttributeScore {
    score: number;
    explanation: string;
}
```

### Attribute Names

The 7 core attributes:
1. `Camera`
2. `Battery Endurance`
3. `Performance`
4. `Display`
5. `Software Experience`
6. `Design & Build`
7. `Longevity Value`

---

## Error Handling

All server actions use try/catch and return structured errors:

```typescript
try {
    // ... action logic
} catch (error) {
    console.error("Failed to fetch:", error);
    return { success: false, error: "Operation failed" };
}
```

Client components should handle errors gracefully:

```typescript
const result = await submitUpvote(phoneId);
if (!result.success) {
    toast.error(result.error || "Something went wrong");
}
```

---

## Rate Limiting

Currently no rate limiting implemented. For production:
- Consider IP-based limits for feedback actions
- Use Supabase RLS policies for data access
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
# OSET Algorithm Documentation

**O**bjective **S**coring **E**valuation **T**ransform

The OSET algorithm is the core scoring system that normalizes, weights, and applies time-decay to phone attribute scores.

---

## Overview

```mermaid
flowchart LR
    subgraph Input
        Raw[Raw Scores]
        Dates[Release Dates]
    end
    
    subgraph OSET
        Norm[Normalization]
        Decay[Time Decay]
        Weight[Weighting]
    end
    
    subgraph Output
        Final[Final Scores]
    end
    
    Raw --> Norm
    Dates --> Decay
    Norm --> Decay
    Decay --> Weight
    Weight --> Final
```

---

## The 7 Attributes

| Attribute | Weight | Description |
|-----------|--------|-------------|
| Camera | 0.20 | Photo/video quality, lens versatility |
| Battery Endurance | 0.15 | Battery life, charging speed |
| Performance | 0.15 | CPU/GPU benchmarks, real-world speed |
| Display | 0.15 | Brightness, refresh rate, color accuracy |
| Software Experience | 0.15 | OS fluidity, update policy, features |
| Design & Build | 0.10 | Materials, ergonomics, durability |
| Longevity Value | 0.10 | Price-to-value, repair, resale |

**Total**: 1.00

---

## Step 1: Score Collection

Raw scores come from AI enrichment (1-10 scale):

```json
{
  "originalAttributes": {
    "Camera": { "score": 8.72, "explanation": "..." },
    "Battery Endurance": { "score": 9.45, "explanation": "..." },
    "Performance": { "score": 9.28, "explanation": "..." },
    "Display": { "score": 9.61, "explanation": "..." },
    "Software Experience": { "score": 7.85, "explanation": "..." },
    "Design & Build": { "score": 9.18, "explanation": "..." },
    "Longevity Value": { "score": 7.30, "explanation": "..." }
  }
}
```

---

## Step 2: Cross-Phone Normalization

Scores are normalized relative to all phones in the dataset.

### Formula

```
normalized = ((raw - min) / (max - min)) * 10
```

### Example

For Camera scores across 50 phones:
- Min score: 5.2
- Max score: 9.8
- Raw score for Phone X: 8.72

```
normalized = ((8.72 - 5.2) / (9.8 - 5.2)) * 10
           = (3.52 / 4.6) * 10
           = 7.65
```

### Clamping

Final normalized score is clamped to [0, 10]:
```typescript
const clamped = Math.max(0, Math.min(10, normalized));
```

---

## Step 3: Time-Based Decay

Older phones receive score penalties to reflect technological depreciation.

### Decay Formula

```typescript
const ageMonths = getAgeInMonths(releaseDate);
const decayFactor = Math.exp(-DECAY_RATE * ageMonths);
const decayedScore = score * decayFactor;
```

### Decay Rates by Attribute

| Attribute | Decay Rate | Rationale |
|-----------|------------|-----------|
| Performance | 0.015 | Tech advances rapidly |
| Camera | 0.012 | Computational photography evolves |
| Display | 0.010 | Refresh rates, brightness improve |
| Software | 0.008 | Updates extend relevance |
| Battery | 0.008 | Capacity improvements steady |
| Design | 0.005 | Aesthetic is timeless |
| Longevity | 0.005 | Value compounds over time |

### Decay Curve

```
Age (months)    Decay Factor (Performance)
0               1.00
6               0.91
12              0.84
18              0.76
24              0.70
36              0.58
```

---

## Step 4: Weighted Overall Score

```typescript
const overallScore = 
    camera * 0.20 +
    battery * 0.15 +
    performance * 0.15 +
    display * 0.15 +
    software * 0.15 +
    design * 0.10 +
    longevity * 0.10;
```

---

## Step 5: Output

Normalized + decayed scores are stored in `attributes`:

```json
{
  "originalAttributes": { ... },  // Raw from enrichment
  "attributes": {                  // Post-OSET
    "Camera": { "score": 6.13, "explanation": "..." },
    "Battery Endurance": { "score": 10, "explanation": "..." },
    // ...
  },
  "overallScore": 8.77  // Weighted final
}
```

---

## Configuration

In `scripts/OSET.ts`:

```typescript
const ATTRIBUTE_WEIGHTS = {
    "Camera": 0.20,
    "Battery Endurance": 0.15,
    "Performance": 0.15,
    "Display": 0.15,
    "Software Experience": 0.15,
    "Design & Build": 0.10,
    "Longevity Value": 0.10
};

const DECAY_RATES = {
    "Camera": 0.012,
    "Battery Endurance": 0.008,
    "Performance": 0.015,
    "Display": 0.010,
    "Software Experience": 0.008,
    "Design & Build": 0.005,
    "Longevity Value": 0.005
};

const NORMALIZATION_PERCENTILE = 0.95; // Exclude outliers
```

---

## Brand Overrides

Some brands have adjusted weights based on brand identity:

```typescript
const BRAND_OVERRIDES = {
    "apple": {
        "Software Experience": 0.20,  // iOS ecosystem premium
        "Performance": 0.12           // Adjust down
    },
    "google": {
        "Camera": 0.25,              // Pixel camera priority
        "Software Experience": 0.20
    },
    "samsung": {
        "Display": 0.20              // Display excellence
    }
};
```

---

## Running OSET

```bash
# Run OSET phase
npm run pipeline:oset

# Or as part of full pipeline
npm run pipeline
```

### Output Logs

```
[OSET] Loading 52 phones...
[OSET] Calculating normalization bounds...
[OSET] Camera: min=5.2, max=9.8
[OSET] Applying decay for apple_iphone_15_pro (age: 15 months)
[OSET] Final score: 8.45 → 7.92 (after decay)
[OSET] Saved 52 phones
```

---

## Validation

OSET includes self-validation:

```typescript
// Score sanity checks
if (overallScore < 0 || overallScore > 10) {
    logger.warn(`Invalid score for ${phoneId}: ${overallScore}`);
}

// Attribute completeness
const missing = REQUIRED_ATTRIBUTES.filter(a => !phone.attributes[a]);
if (missing.length > 0) {
    logger.warn(`Missing attributes for ${phoneId}: ${missing.join(', ')}`);
}
```

---

## Future Enhancements

1. **User Feedback Loop**: Adjust weights based on user upvotes
2. **Regional Pricing**: Include price normalization
3. **Regret Integration**: Factor in regret scores
4. **Category-Specific Weights**: Different weights for flagships vs budget
# Database Schema Documentation

Complete reference for the SmartMatch database schema.

---

## Overview

SmartMatch uses **Supabase** (PostgreSQL) with **Drizzle ORM**.

```mermaid
erDiagram
    phones ||--o{ reviews : has
    processed_phones ||--|| dynamic_phones : mirrors
    feedbacks }o--|| processed_phones : references
    upvote_counts ||--|| processed_phones : aggregates
    
    phones {
        serial id PK
        text name
        text brand
        text model
        integer price
        timestamp release_date
        jsonb specs
    }
    
    processed_phones {
        serial id PK
        text phone_id UK
        text brand
        text model
        numeric overall_score
        text category
        numeric camera_score
        numeric battery_score
        jsonb full_data
    }
    
    feedbacks {
        serial id PK
        text phone_id
        enum feedback_type
        enum report_category
        text description
    }
```

---

## Tables

### phones

Core product data (not actively used in current implementation).

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `name` | text | Full display name |
| `brand` | text | e.g., "Apple", "Samsung" |
| `model` | text | e.g., "iPhone 15 Pro" |
| `price` | integer | Price in cents |
| `release_date` | timestamp | Release date |
| `image_url` | text | Hero image URL |
| `specs` | jsonb | Raw specifications |
| `ai_summary` | text | AI-generated summary |
| `created_at` | timestamp | Record creation |
| `updated_at` | timestamp | Last update |

---

### processed_phones

Main table for enriched phone data (pre-OSET scores).

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `phone_id` | text | Unique identifier (e.g., "apple_iphone_15_pro") |
| `brand` | text | Brand name |
| `model` | text | Model name |
| `release_date` | timestamp | Phone release date |
| `overall_score` | numeric(4,2) | 0-10 score |
| `category` | text | "flagship", "premium", "midrange", "budget" |
| `summary` | text | One-page summary |
| `pros` | text | Pros (newline-separated) |
| `cons` | text | Cons (newline-separated) |
| `camera_score` | numeric(4,2) | Camera attribute score |
| `battery_score` | numeric(4,2) | Battery attribute score |
| `performance_score` | numeric(4,2) | Performance attribute score |
| `display_score` | numeric(4,2) | Display attribute score |
| `software_score` | numeric(4,2) | Software attribute score |
| `design_score` | numeric(4,2) | Design attribute score |
| `longevity_score` | numeric(4,2) | Longevity/value score |
| `camera_main` | text | Main camera description |
| `camera_telephoto` | text | Telephoto capabilities |
| `camera_video` | text | Video features |
| `last_processed_at` | timestamp | Last enrichment run |
| `enrichment_status` | text | "completed", "failed", "pending" |
| `facts_version` | text | Processing version (e.g., "v7-Final") |
| `confidence` | integer | AI confidence (0-100) |
| `processing_time_ms` | integer | Enrichment duration |
| `full_data` | jsonb | Complete enrichment JSON |
| `created_at` | timestamp | Record creation |
| `updated_at` | timestamp | Last update |

**Unique Constraint**: `phone_id`

---

### dynamic_phones

Post-OSET normalized scores (same schema as processed_phones).

This table contains:
- Normalized attribute scores (0-10 scale relative to all phones)
- Time-decayed scores based on phone age
- Recalculated overall score with weights

---

### feedbacks

User feedback (upvotes and reports).

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `phone_id` | text | Phone identifier |
| `feedback_type` | enum | "upvote" or "report" |
| `report_category` | enum | Report category (nullable) |
| `description` | text | Report description (nullable) |
| `created_at` | timestamp | Submission time |
| `user_ip` | text | Hashed IP for rate limiting |

**Report Categories**:
- `wrong_score`
- `wrong_spec`
- `outdated_info`
- `missing_info`
- `other`

---

### upvote_counts

Aggregated upvote counts per phone (for performance).

| Column | Type | Description |
|--------|------|-------------|
| `phone_id` | text | Primary key |
| `count` | integer | Total upvotes |
| `updated_at` | timestamp | Last update |

---

### processing_metadata

Pipeline performance tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `total_processed_phones` | integer | Total phones processed |
| `last_updated` | timestamp | Last run time |
| `avg_processing_time` | integer | Avg ms per phone |
| `total_deepseek_calls` | integer | Total AI API calls |
| `avg_confidence` | integer | Avg confidence % |
| `created_at` | timestamp | Record creation |

---

### reviews

Aggregated reviews from external sources.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial | Primary key |
| `phone_id` | integer | FK to phones.id |
| `source` | text | e.g., "GSMArena" |
| `url` | text | Review URL |
| `author` | text | Reviewer name |
| `rating` | integer | Normalized 0-100 |
| `summary` | text | Review summary |
| `sentiment` | text | "positive", "neutral", "negative" |
| `published_at` | timestamp | Publish date |
| `created_at` | timestamp | Record creation |

---

## Drizzle Schema

Located in `lib/db/schema.ts`:

```typescript
import { pgTable, serial, text, numeric, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const processedPhones = pgTable('processed_phones', {
    id: serial('id').primaryKey(),
    phone_id: text('phone_id').notNull().unique(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    overall_score: numeric('overall_score', { precision: 4, scale: 2 }),
    // ... more columns
    full_data: jsonb('full_data'),
});
```

---

## Migrations

Migrations are managed by Drizzle Kit.

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Reset database (DESTRUCTIVE)
npm run db:reset
```

Migration files: `drizzle/*.sql`

---

## Indexes

Recommended indexes for performance:

```sql
-- Fast phone lookup
CREATE INDEX idx_processed_phones_phone_id ON processed_phones(phone_id);

-- Rankings sorting
CREATE INDEX idx_processed_phones_overall_score ON processed_phones(overall_score DESC);

-- Category filtering
CREATE INDEX idx_processed_phones_category ON processed_phones(category);

-- Feedback aggregation
CREATE INDEX idx_feedbacks_phone_id ON feedbacks(phone_id);
```

---

## Connection

Database connection in `lib/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client);
```

---

## Backup Strategy

1. **JSON Files**: `data/processed_content/` serves as file-based backup
2. **full_data Column**: Complete JSON stored in database
3. **Supabase Backups**: Automatic daily backups (Supabase Pro)

To restore from JSON:
```bash
npm run pipeline:sync
```
# Deployment Guide

Complete guide for deploying SmartMatch PWA to production.

---

## Deployment Options

| Platform | Best For | Complexity |
|----------|----------|------------|
| Vercel | Primary (recommended) | Low |
| Netlify | Alternative hosting | Low |
| Docker | Self-hosted | Medium |
| AWS/GCP | Enterprise scale | High |

---

## Vercel Deployment

### Prerequisites

1. Vercel account
2. GitHub repository connected
3. Supabase project with database

### Step 1: Connect Repository

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

### Step 2: Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...@db.xxx.supabase.co:5432/postgres` | All |
| `CSE_API_KEY` | Google API key | All |
| `CSE_ENGINE_ID` | Search engine ID | All |
| `DEEPSEEK_API_KEY` | DeepSeek API key | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | All |

### Step 3: Configure Build

`vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "crons": [{
    "path": "/api/cron/pipeline",
    "schedule": "0 4 * * *"
  }]
}
```

### Step 4: Deploy

```bash
# Production deployment
vercel --prod

# Preview deployment
vercel
```

---

## Supabase Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note connection string from Settings → Database

### 2. Apply Migrations

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"

# Run migrations
npm run db:migrate
```

### 3. Initial Data Sync

```bash
# Sync processed data to Supabase
npm run pipeline:sync
```

---

## CI/CD Pipeline

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 4 * * *'  # Daily at 4 AM UTC

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run QA checks
        run: npm run quality
      
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### GitLab CI

`.gitlab-ci.yml` (already included in repo):

```yaml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - npm ci
    - npm run quality

build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - .next/

deploy:
  stage: deploy
  script:
    - npx vercel --prod --token=$VERCEL_TOKEN
  only:
    - main
```

---

## Production Checklist

### Pre-Deployment

- [ ] All tests passing (`npm run test:unit`)
- [ ] Type check passing (`npm run qa:type-check`)
- [ ] Lint passing (`npm run qa:lint`)
- [ ] Environment variables set in Vercel
- [ ] Database migrated
- [ ] Data synced to production database

### Post-Deployment

- [ ] Verify homepage loads
- [ ] Verify rankings page loads data
- [ ] Verify phone details pages work
- [ ] Test share functionality
- [ ] Test feedback buttons
- [ ] Check performance (Core Web Vitals)

---

## Monitoring

### Vercel Analytics

Enable in Vercel Dashboard → Analytics:
- Page views
- Web Vitals
- Function invocations

### Error Tracking

Recommended: Sentry

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Database Monitoring

Supabase Dashboard provides:
- Query performance
- Connection pooling stats
- Storage usage

---

## Scaling

### Edge Functions

For global latency, deploy API routes to edge:

```typescript
// app/api/rankings/route.ts
export const runtime = 'edge';
```

### Caching

Next.js ISR (Incremental Static Regeneration):

```typescript
// app/onyx/rankings/page.tsx
export const revalidate = 3600; // Revalidate every hour
```

### Database Connection Pooling

Use Supabase connection pooler for serverless:

```
DATABASE_URL=postgresql://postgres.xxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

---

## Rollback

### Vercel Rollback

1. Go to Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click "..." → "Promote to Production"

### Database Rollback

1. Data is stored in `full_data` JSONB column
2. JSON files in `data/processed_content/` serve as backup
3. Re-run sync: `npm run pipeline:sync`

---

## Domain Setup

### Custom Domain

1. Vercel Dashboard → Settings → Domains
2. Add domain: `smartmatch.app`
3. Configure DNS:
   - `A` record → `76.76.21.21`
   - `CNAME` for `www` → `cname.vercel-dns.com`

### SSL

Automatic with Vercel (Let's Encrypt).

---

## Cost Estimation

### Vercel (Hobby/Pro)

| Tier | Cost | Limits |
|------|------|--------|
| Hobby | Free | 100GB bandwidth, 10s functions |
| Pro | $20/mo | 1TB bandwidth, 60s functions |

### Supabase

| Tier | Cost | Limits |
|------|------|--------|
| Free | $0 | 500MB DB, 2GB bandwidth |
| Pro | $25/mo | 8GB DB, unlimited bandwidth |

### Estimated Monthly

- **Low Traffic**: Free tier viable
- **Moderate Traffic**: ~$45/mo (Vercel Pro + Supabase Pro)
- **High Traffic**: ~$100+/mo (enterprise tiers)
