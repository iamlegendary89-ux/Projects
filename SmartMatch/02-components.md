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
