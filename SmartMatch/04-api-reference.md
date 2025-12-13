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
