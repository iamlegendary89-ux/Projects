# SmartMatch PWA — Final Architecture Documentation

> **Version**: 2.1 FINAL | **Updated**: December 2025  
> AI-powered smartphone recommendation engine with long-term satisfaction focus

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [The 8 Sacred Rules](#2-the-8-sacred-rules)
3. [Architecture](#3-architecture)
4. [Data Model](#4-data-model)
5. [File Structure](#5-file-structure)
6. [Frontend Blueprint](#6-frontend-blueprint)
7. [Data Pipeline](#7-data-pipeline)
8. [Database Schema](#8-database-schema)
9. [Server Actions](#9-server-actions)
10. [Components](#10-components)
11. [Deployment](#11-deployment)

---

## 1. Project Overview

### What is SmartMatch?

SmartMatch is a **Progressive Web App** that recommends smartphones based on long-term user satisfaction rather than just specs. It uses:

- **OSET Algorithm**: Time-decay scoring across 7 attributes
- **Dual-State Database**: Raw scores + post-OSET dynamic scores
- **Server-Side Quiz Brain**: All inference happens on server (uncloneable)
- **Progressive Enhancement**: Works without JavaScript

### User Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Landing   │────▶│    Quiz     │────▶│   Result    │
│   (Hero)    │     │(Server Form)│     │  (Match)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐                         ┌─────────────┐
│  Rankings   │◀────────────────────────│   Phone     │
│   (List)    │                         │  (Details)  │
└─────────────┘                         └─────────────┘
```

---

## 2. The 8 Sacred Rules

> **THESE ARE IMMUTABLE. DO NOT VIOLATE.**

| # | Rule | Implementation |
|---|------|----------------|
| 1 | **Pipeline order**: Discovery → Enrichment → OSET → Sync | `scripts/pipeline.ts` enforces order |
| 2 | **JSON source of truth**: `data/processed_content/{phone_id}/{phone_id}.json` | No `enriched.json` or `scored.json` |
| 3 | **Dual-state DB**: `processed_phones` (raw) + `dynamic_phones` (post-OSET) | Two separate tables |
| 4 | **`full_data` JSONB** keeps everything | All scraped/enriched data preserved |
| 5 | **Quiz logic SERVER-SIDE ONLY** | `lib/quiz-actions.ts` - no client inference |
| 6 | **OSET uses exactly 7 attributes** | Camera, Battery, Performance, Software, Design, Display, Longevity |
| 7 | **Enrichment is offline batch only** | Never called at runtime |
| 8 | **Progressive enhancement** | JS disabled = form still submits |

---

## 3. Architecture

### System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Home    │  │   Quiz   │  │  Result  │  │ Rankings │      │
│  │  page    │  │ (FORM!)  │  │  page    │  │  page    │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │             │             │             │
│       └─────────────┴─────────────┴─────────────┘             │
│                           │                                   │
│                 SERVER ACTIONS (form action)                  │
└───────────────────────────┼───────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────┐
│                        BACKEND                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         lib/quiz-actions.ts (Quiz Brain)              │    │
│  │  • inferArchetype()  • calculateMatch()  • getResult()│    │
│  │  ALL WEIGHTS, SCORING, LOGIC HERE — UNCLONEABLE       │    │
│  └──────────────────────────┬───────────────────────────┘    │
│                             │                                 │
│  ┌──────────────────────────┴───────────────────────────┐    │
│  │              lib/actions.ts (Data Actions)            │    │
│  │  • getRankings()  • getPhoneDetails()                 │    │
│  └──────────────────────────┬───────────────────────────┘    │
│                             │                                 │
│  ┌──────────────────────────┴───────────────────────────┐    │
│  │              lib/db/ (Drizzle ORM)                    │    │
│  └──────────────────────────┬───────────────────────────┘    │
└─────────────────────────────┼─────────────────────────────────┘
                              │
┌─────────────────────────────┼─────────────────────────────────┐
│                      SUPABASE (Dual-State)                    │
│  ┌────────────────────────┐  ┌────────────────────────┐      │
│  │    processed_phones    │  │    dynamic_phones      │      │
│  │    (Raw Enrichment)    │  │    (Post-OSET Scores)  │      │
│  │    + full_data JSONB   │  │    + full_data JSONB   │      │
│  └────────────────────────┘  └────────────────────────┘      │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                    DATA PIPELINE (Offline Only)               │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │Discovery │─▶│Enrichment│─▶│   OSET   │─▶│   Sync   │      │
│  │ (scrape) │  │   (AI)   │  │ (7 attrs)│  │ (dual DB)│      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│       │             │             │             │             │
│       ▼             ▼             ▼             ▼             │
│ data/processed_content/{phone_id}/{phone_id}.json             │
│                                     │                         │
│                    ┌────────────────┴────────────────┐        │
│                    ▼                                 ▼        │
│           processed_phones                   dynamic_phones   │
│           (original scores)                  (OSET scores)    │
└───────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### Source of Truth: JSON Files

```
data/processed_content/
├── iphone-16-pro/
│   └── iphone-16-pro.json       ← CANONICAL FILE
├── pixel-9-pro/
│   └── pixel-9-pro.json
├── galaxy-s24-ultra/
│   └── galaxy-s24-ultra.json
└── ...
```

**Each JSON file contains:**
```json
{
  "id": "iphone-16-pro",
  "brand": "Apple",
  "model": "iPhone 16 Pro",
  "releaseDate": "2024-09-20",
  "attributes": {
    "camera": 9.2,
    "battery": 8.5,
    "performance": 9.5,
    "software": 9.0,
    "design": 8.8,
    "display": 9.3,
    "longevity": 9.0
  },
  "pros": ["Best-in-class camera", "A18 Pro chip"],
  "cons": ["Expensive", "Limited customization"],
  "summary": "Premium flagship for photo enthusiasts",
  "regretFactors": {
    "battery": 0.15,
    "price": 0.25
  },
  "sources": ["gsmarena", "youtube-mkbhd", "reddit-apple"]
}
```

### The 7 Attributes (Sacred)

| Attribute | Description | OSET Decay λ |
|-----------|-------------|--------------|
| `camera` | Photo/video quality | 0.02 (slow) |
| `battery` | Battery life & efficiency | 0.05 |
| `performance` | CPU/GPU speed | 0.08 (fast) |
| `software` | OS experience, updates | 0.03 |
| `design` | Build, aesthetics | 0.01 (very slow) |
| `display` | Screen quality | 0.04 |
| `longevity` | Expected lifespan | 0.02 |

---

## 5. File Structure

```
smartmatch-new/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home (Top 3 + CTAs)
│   ├── globals.css              # Tailwind v4 @theme
│   ├── quiz/
│   │   └── page.tsx             # Quiz (FORM - no client JS needed)
│   ├── result/
│   │   └── page.tsx             # Result (server-rendered)
│   ├── rankings/
│   │   └── page.tsx             # Rankings list
│   └── phone/
│       └── [slug]/
│           └── page.tsx         # Phone details
│
├── components/                   # UI Components (5 only)
│   ├── Card.tsx                 # Glass card
│   ├── PhoneImage.tsx           # Image with fallback
│   ├── RegretMeter.tsx          # 7-attribute regret viz
│   ├── FeedbackButtons.tsx      # Upvote/Report
│   └── ShareButton.tsx          # Social sharing
│
├── lib/                          # Server Logic (CRITICAL)
│   ├── actions.ts               # Data fetching
│   ├── quiz-actions.ts          # QUIZ BRAIN (ALL LOGIC HERE)
│   ├── core/
│   │   └── archetypes.ts        # User archetype definitions
│   └── db/
│       ├── index.ts             # DB connection
│       └── schema.ts            # Drizzle schema (DUAL-STATE)
│
├── scripts/                      # Pipeline (SACRED - COPY ONLY)
│   ├── discovery.ts
│   ├── enrichment.ts
│   ├── OSET.ts
│   ├── sync.ts                  # Writes to BOTH tables
│   └── pipeline.ts
│
├── data/
│   ├── phones.json              # Discovery output (basic list)
│   └── processed_content/       # SOURCE OF TRUTH
│       └── {phone_id}/
│           └── {phone_id}.json  # Full enriched data
│
└── docs/
    └── README.md                # This file
```

---

## 6. Frontend Blueprint

### Design System: Onyx UI

#### Colors (Tailwind v4 @theme)

```css
@theme {
  --color-onyx-primary: #00D4FF;    /* Cyan accent */
  --color-void-black: #1A1A2E;      /* Background */
  --color-pure-light: #F5F5F5;      /* Text */
  --color-accent-indigo: #4D4DFF;
  --color-accent-violet: #C07CFF;
}
```

#### Typography

```css
@theme {
  --font-sans: 'Satoshi', system-ui, sans-serif;
}
```

---

### Page Blueprints

#### Quiz Page (PROGRESSIVE ENHANCEMENT)

```
┌─────────────────────────────────────────────┐
│  ← Back                                      │
│                                              │
│  ████████████░░░░░░░░░░  40%                │
│                                              │
│         What do you mostly use               │
│           your phone for?                    │
│                                              │
│  <form action={submitQuiz}>                  │
│  ┌─────────────────────────────────────┐    │
│  │ <input type="radio" name="usage">   │    │
│  │   Photography & Social Media        │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ <input type="radio" name="usage">   │    │
│  │   Gaming & Entertainment            │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  <button type="submit">Next</button>         │
│  </form>                                     │
│                                              │
│            Question 2 of 5                   │
└─────────────────────────────────────────────┘
```

**CRITICAL**: Quiz uses `<form action={serverAction}>`:
- Works without JavaScript
- All logic in `lib/quiz-actions.ts`
- Form submits to server, server redirects to result

**Implementation:**
```tsx
// app/quiz/page.tsx
import { submitQuizStep } from '@/lib/quiz-actions';

export default function QuizPage({ searchParams }) {
  const step = searchParams.step || 1;
  
  return (
    <form action={submitQuizStep}>
      <input type="hidden" name="step" value={step} />
      {/* Radio buttons for current question */}
      <button type="submit">Next</button>
    </form>
  );
}
```

---

#### Result Page (Server-Rendered)

```
┌─────────────────────────────────────────────┐
│                                              │
│            YOUR PERFECT MATCH                │
│                                              │
│              iPhone 16 Pro                   │
│                 Apple                        │
│                                              │
│              87% match                       │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │  Why this phone?                    │    │
│  │  ✓ Camera priority matched          │    │
│  │  ✓ Flagship budget aligned          │    │
│  │  ✓ iOS ecosystem preference         │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │      7-Attribute Regret Meter        │   │
│  │  Camera:      ██████████░░ Low       │   │
│  │  Battery:     ████████░░░░ Med       │   │
│  │  Performance: ██████████░░ Low       │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [View Details]     [Retake Quiz]           │
└─────────────────────────────────────────────┘
```

---

## 7. Data Pipeline

### Pipeline Execution Order (SACRED)

```bash
npm run pipeline

# Executes in EXACT order:
1. Discovery   → phones.json (basic list)
2. Enrichment  → processed_content/{id}/{id}.json
3. OSET        → Updates JSON with time-decayed scores
4. Sync        → Writes to BOTH database tables
```

### OSET Algorithm (7 Attributes)

```
Score(t) = BaseScore × e^(-λ × t)

Where:
- t = months since release
- λ = category-specific decay constant

Decay Constants:
  camera:      0.02
  battery:     0.05  
  performance: 0.08
  software:    0.03
  design:      0.01
  display:     0.04
  longevity:   0.02
```

### Sync Dual-State Operation

```typescript
// scripts/sync.ts
async function syncPhone(phone: PhoneData) {
  // 1. Extract original scores (pre-OSET)
  const rawData = {
    ...phone,
    attributes: phone.originalAttributes,
    score: phone.originalOverallScore,
    full_data: phone  // EVERYTHING preserved
  };
  
  // 2. Extract OSET scores
  const dynamicData = {
    ...phone,
    attributes: phone.attributes,  // Post-OSET
    score: phone.overallScore,
    full_data: phone
  };
  
  // 3. Upsert to BOTH tables
  await db.insert(processedPhones).values(rawData).onConflictDoUpdate();
  await db.insert(dynamicPhones).values(dynamicData).onConflictDoUpdate();
}
```

---

## 8. Database Schema

### Dual-State Tables (SACRED)

#### processed_phones (Raw Enrichment Scores)

```sql
CREATE TABLE processed_phones (
  id              TEXT PRIMARY KEY,
  brand           TEXT NOT NULL,
  model           TEXT NOT NULL,
  release_date    DATE,
  
  -- Original scores (pre-OSET)
  camera_score      DECIMAL(4,2),
  battery_score     DECIMAL(4,2),
  performance_score DECIMAL(4,2),
  software_score    DECIMAL(4,2),
  design_score      DECIMAL(4,2),
  display_score     DECIMAL(4,2),
  longevity_score   DECIMAL(4,2),
  overall_score     DECIMAL(4,2),
  
  -- Content
  pros            JSONB,
  cons            JSONB,
  summary         TEXT,
  
  -- SACRED: Keep everything
  full_data       JSONB NOT NULL,
  
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### dynamic_phones (Post-OSET Scores)

```sql
CREATE TABLE dynamic_phones (
  id              TEXT PRIMARY KEY,
  brand           TEXT NOT NULL,
  model           TEXT NOT NULL,
  release_date    DATE,
  
  -- OSET-adjusted scores (these decay over time)
  camera_score      DECIMAL(4,2),
  battery_score     DECIMAL(4,2),
  performance_score DECIMAL(4,2),
  software_score    DECIMAL(4,2),
  design_score      DECIMAL(4,2),
  display_score     DECIMAL(4,2),
  longevity_score   DECIMAL(4,2),
  overall_score     DECIMAL(4,2),
  
  -- Content
  pros            JSONB,
  cons            JSONB,
  summary         TEXT,
  
  -- SACRED: Keep everything
  full_data       JSONB NOT NULL,
  
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### feedback

```sql
CREATE TABLE feedback (
  id         SERIAL PRIMARY KEY,
  phone_id   TEXT,
  type       TEXT CHECK (type IN ('upvote', 'downvote', 'report')),
  reason     TEXT,
  user_ip    TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 9. Server Actions

### Quiz Brain (lib/quiz-actions.ts)

**ALL QUIZ LOGIC IS HERE. NOT EXPOSED TO CLIENT.**

```typescript
"use server";

interface QuizAnswers {
  usage: 'photography' | 'gaming' | 'productivity' | 'basic';
  budget: 'budget' | 'midrange' | 'premium' | 'flagship';
  battery: 'essential' | 'important' | 'moderate' | 'low';
  camera: 'essential' | 'important' | 'moderate' | 'low';
  ecosystem: 'ios' | 'android' | 'any';
}

// SACRED: All weights server-side only
const ATTRIBUTE_WEIGHTS = {
  photography: { camera: 0.4, display: 0.2, performance: 0.2, ... },
  gaming:      { performance: 0.4, display: 0.3, battery: 0.15, ... },
  // ...
};

const ARCHETYPE_PROFILES = {
  // Complex matching logic - UNCLONEABLE
};

export async function submitQuizStep(formData: FormData) {
  // Validate step, accumulate answers
  // On final step: calculate match, redirect to /result
}

export async function getQuizResult(answers: QuizAnswers): Promise<MatchResult> {
  // 1. Infer user archetype
  const archetype = inferArchetype(answers);
  
  // 2. Get phones from dynamic_phones (OSET scores)
  const phones = await db.select().from(dynamicPhones);
  
  // 3. Score each phone against archetype
  const scored = phones.map(phone => ({
    phone,
    matchScore: calculateMatch(phone, archetype, answers),
    reasons: generateReasons(phone, archetype)
  }));
  
  // 4. Return best match
  return scored.sort((a, b) => b.matchScore - a.matchScore)[0];
}
```

### Data Actions (lib/actions.ts)

```typescript
"use server";

export async function getRankings() {
  // Reads from dynamic_phones (OSET scores for UI)
  return db.select()
    .from(dynamicPhones)
    .orderBy(desc(dynamicPhones.overall_score));
}

export async function getPhoneDetails(slug: string) {
  // Reads from dynamic_phones, includes full_data
  return db.select()
    .from(dynamicPhones)
    .where(eq(dynamicPhones.id, slug))
    .limit(1);
}
```

---

## 10. Components

### RegretMeter (7 Attributes)

```tsx
interface RegretMeterProps {
  attributes: {
    camera: number;
    battery: number;
    performance: number;
    software: number;
    design: number;
    display: number;
    longevity: number;
  };
  regretFactors: Record<string, number>;
}

// Visualizes all 7 attributes with regret overlay
```

---

## 11. Deployment

### Environment Variables

```env
DATABASE_URL=postgresql://...

# Pipeline only (dev)
CSE_API_KEY=...
CSE_CX=...
OPENAI_API_KEY=...
```

### Commands

```bash
npm run dev           # Development
npm run build         # Production build
npm run pipeline      # Full pipeline
npm run pipeline:sync # Sync only
npm run db:generate   # Generate migrations
npm run db:migrate    # Run migrations
```

---

## Compliance Checklist

| # | Sacred Rule | Status |
|---|-------------|--------|
| 1 | Pipeline order: Discovery → Enrichment → OSET → Sync | ✅ |
| 2 | JSON in `data/processed_content/{id}/{id}.json` | ✅ |
| 3 | Dual-state: `processed_phones` + `dynamic_phones` | ✅ |
| 4 | `full_data` JSONB keeps everything | ✅ |
| 5 | Quiz logic server-side only | ✅ |
| 6 | OSET uses exactly 7 attributes | ✅ |
| 7 | Enrichment offline batch only | ✅ |
| 8 | Progressive enhancement (form works without JS) | ✅ |

---

*SmartMatch Final Architecture v2.1 — All Sacred Rules Compliant*
