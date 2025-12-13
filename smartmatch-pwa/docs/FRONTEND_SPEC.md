# SmartMatch Frontend Specification

## 1. Overview
**SmartMatch** is a "Destiny-Based Recommendation Engine" designed as a Progressive Web App (PWA). It moves away from traditional tech-spec comparisons (specs, benchmarks) towards an emotional, archetype-based matching system ("The One").

**Core Value Prop**: "The one that was waiting for you."

## 2. Technical Architecture

### 2.1 Technology Stack
- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Language**: TypeScript 5.0+
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with CSS Variables
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State Management**: React `useState` (Local Component State) + Prop Drilling
- **Icons**: Lucide React

### 2.2 File Structure
```
app/
├── layout.tsx       # Root layout (Theme, Fonts, Metadata)
├── page.tsx         # Server Component (Fetches initial PhoneData)
└── globals.css      # Global CSS Variables & Tailwind Directives

components/
└── SmartMatch/       # Specialized Design System
    ├── screens/     # Full-page interactive views (Landing, Guided, etc.)
    ├── Button.tsx   # Custom UI primitive
    ├── Card.tsx     # Glassmorphism container
    ├── Input.tsx    # Forms & Sliders
    └── ...

lib/
├── phones.ts        # Data Access Layer (FileSystem -> JSON)
├── SmartMatch.ts     # Recommendation Algorithm (Client-side execution)
└── canonical-types.ts # Shared Data Models
```

## 3. Design System ("The Void")

The design language conveys a sense of premium mystery and technological spirituality.

### 3.1 Color Palette
Defined in `globals.css` and `tailwind.config.js`.

| Token | Scoped Var | Hex | Usage |
|-------|------------|-----|-------|
| **Background** | `--void-black` | `#1A1A2E` | Main app background, deep space feel. |
| **Primary** | `--soul-cyan` | `#00D4FF` | Interactive elements, "Soul" energy, highlights. |
| **Foreground** | `--pure-light` | `#F5F5F5` | Primary text, high contrast. |
| **Accent** | `--accent-violet` | `#C07CFF` | Secondary energy, magical elements. |
| **Glass** | `--glass-border` | `rgba(255,255,255,0.15)` | Borders for glassmorphism cards. |

### 3.2 Typography
- **Headings**: `Satoshi` (Variable Weight) - Modern, geometric, clean.
- **Body**: `Inter` (Google Font) - Highly legible, standard web font.

### 3.3 Components
- **Glass Card**: `bg-black/20 backdrop-blur-md` with `border-white/10`.
- **Soul Button**: Custom button with hover glow effects (`shadow-[0_0_20px_var(--soul-cyan)]`).
- **Particles**: `ParticleField.tsx` provides the ambient background animation connected to the user's archetype state.

## 4. User Journey & State Machine

The application follows a linear, single-session state flow managed in `SmartMatchClient.tsx`.

### Flow States (`FlowState` type):
1.  **`landing`**:
    *   **Goal**: Emotional hook. "The one that was waiting for you."
    *   **Action**: User clicks "Begin".
2.  **`guided`**:
    *   **Goal**: Gather user preferences implicitly via archetypal questions.
    *   **Component**: `GuidedFlow.tsx`
    *   **Data**: User selects answers -> Mapped to `QuizAnswers`.
3.  **`thinking`**:
    *   **Goal**: Build anticipation. Simulate AI processing ("Consulting the Oracle").
    *   **Duration**: ~3 seconds (Artificial delay).
4.  **`reveal`**:
    *   **Goal**: The "Aha!" moment. Show **one** single best match.
    *   **Component**: `DestinyReveal.tsx`
    *   **Display**: Phone render, "The One" text, Empathy Sentence, Archetype Badge.
5.  **`explore`** (Optional):
    *   **Goal**: Allow power users to see alternatives if the match felt wrong.
    *   **Component**: `Explore.tsx`
    *   **Features**: Grid view, Filters (Brand, Budget), Sort.

## 5. Data Models

### 5.1 PhoneData
Source of truth for a phone's specs and AI-generated content.
```typescript
interface PhoneData {
  id: string;
  brand: string;
  model: string;
  overallScore: number; // 0.0 to 10.0
  onePageSummary: string; // AI Summary
  attributes: Record<string, {
    score: number;
    explanation: string;
  }>;
  image?: string;
  price?: string;
}
```

### 5.2 SmartMatchResult
The output of the matching engine.
```typescript
interface SmartMatchResult {
  data: PhoneData;         // The matched phone
  score: number;           // Compatibility score (0-100)
  archetype: {
    primary: string;       // e.g., "Visionary", "Purist"
    secondary?: string;
  };
  empathy_sentence: string; // AI-generated connection text (e.g., "For the one who sees the future...")
  fate_divergence?: {       // Why it might NOT be perfect (handling trade-offs)
    reason: string;
    message: string;
  };
}
```

## 6. Implementation Guidelines

- **Client vs Server**: Logic that requires interactivity (Quiz, Reveal animations) lives in Client Components. Data fetching happens once in the Server Component (`page.tsx`) and is passed down as props.
- **Responsiveness**: Mobile-first approach. All glass cards scale from `w-full` on mobile to `max-w-4xl` on desktop.
- **Images**: Currently using raw `<img>` tags. **TODO**: Migrate to `next/image` for performance optimization.
