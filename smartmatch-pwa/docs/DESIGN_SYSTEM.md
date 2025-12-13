# SmartMatch Design System ("The Void")

This document serves as the "Figma" source of truth for the SmartMatch frontend. It defines the visual language, tokens, and component library.

---

## 🎨 1. Foundations

### 1.1 Color Palette
The palette is designed to feel "deep, spiritual, and technological".

| Token Pattern | Name | Hex / Value | Usage |
| :--- | :--- | :--- | :--- |
| **Brand** | | | |
| `bg-void-black` | **Void Black** | `#1A1A2E` | **Main Background**. Deep space feel. |
| `text-soul-cyan` | **Soul Cyan** | `#00D4FF` | **Primary Brand**. Used for active states, glows, and key actions. |
| `text-pure-light` | **Pure Light** | `#F5F5F5` | **Primary Text**. High contrast reading. |
| `...-accent-violet`| **Accent Violet**| `#C07CFF` | **Secondary Brand**. Mystical elements, gradients. |
| `...-accent-indigo`| **Deep Indigo** | `#4D4DFF` | Depth gradients. |
| **Glass / Utility**| | | |
| `bg-white/5` | **Glass Surface**| `rgba(255,255,255,0.05)` | Cards, panels. |
| `border-glass-border`| **Glass Border**| `rgba(255,255,255,0.15)` | Subtle stroke for components. |
| `...-white/10` | **Surface Hover**| `rgba(255,255,255,0.10)` | Interactive hovers. |

### 1.2 Typography
| Role | Font Family | Weights Used | Class Extension |
| :--- | :--- | :--- | :--- |
| **Headings** | **Satoshi** | `700` (Bold), `500` (Medium) | `font-heading` |
| **Body** | **Inter** | `400` (Regular), `300` (Light) | `font-sans` |

### 1.3 Effects & Motion
**Shadows (Glows)**
- **Soul Glow**: `shadow-[0_0_16px_rgba(0,212,255,0.4)]` (Primary Actions)
- **Deep Hover**: `shadow-[0_8px_32px_rgba(0,0,0,0.3)]` (Cards)

**Textures**
- **Noise**: `opacity-[0.03] url('https://grainy-gradients.vercel.app/noise.svg')` (Overlay on Cards)

**Animations**
- `animate-breathing-glow`: 4s infinite pulse of brightness and drop-shadow.
- `hover:scale-[1.02]`: Subtle tactility on buttons.

---

## 🧩 2. Component Library

### 2.1 Button (`<Button />`)
Primary interaction element.
- **Base**: Rounded-lg, Medium font, Transition-all (300ms).

| Variant | Visual Specs | Usage |
| :--- | :--- | :--- |
| **Primary** | `bg-soul-cyan` `text-void-black` + *Inner Shimmer Animation* | Key CTAs ("Begin", "Get Results"). |
| **Secondary** | `bg-white/5` `border-glass` `backdrop-blur` | Alternative actions. |
| **Ghost** | `bg-transparent` `text-pure-light/70` | Text links, minor toggles. |

**Sizes:**
- `sm`: h-9 px-4 (Filters)
- `md`: h-12 px-6 (Standard)
- `lg`: h-14 px-8 (Hero)
- `xl`: h-16 px-10 (Landing Page Only)

### 2.2 Card (`<Card />`)
The main container for content. All cards include the **Noise Texture** overlay.

| Variant | Specs | Logic |
| :--- | :--- | :--- |
| **Glass** (Default) | `p-8` `bg-white/5` `backdrop-blur-xl` `rounded-2xl` | Standard content wrapper. |
| **Phone** | `p-0` Aspect `9/19` `bg-black/40` | Device mockup container. |
| **Archetype** | `p-6` Gradient `from-white/5` to `transparent` | Selection grids. |

### 2.3 Inputs & Controls
**Radio Pills (`<RadioGroupItem />`)**
- Shape: `rounded-full`
- Default: `bg-white/5` `border-glass`
- Checked: `bg-soul-cyan` `text-void-black` `shadow-glow`

**Slider (`<Slider />`)**
- Track: `h-2` `bg-white/10`
- Range: `bg-soul-cyan`
- Thumb: `h-5 w-5` `border-2 border-soul-cyan` `bg-void-black`

**Checkbox (`<Checkbox />`)**
- Base: `h-6 w-6` `rounded-md` `bg-white/5`
- Checked: `bg-soul-cyan` `text-void-black`

### 2.4 Data Display
**ProgressBar (`<ProgressBar />`)**
| Variant | Specs |
| :--- | :--- |
| **Standard** | `h-2` `bg-white/10`. Fill: Solid `bg-soul-cyan` |
| **Confidence** | `h-4`. Fill: **Gradient** (`soul-cyan` -> `accent-indigo` -> `accent-violet`) + Glow |

---

## 📐 3. Grid & Spacing
- **Container**: responsive padding `p-4` (mobile) to `p-12` (desktop).
- **Max Widths**:
  - Landing Text: `max-w-4xl`
  - Guided Flow: `max-w-2xl`
  - Destiny Reveal: `max-w-6xl`
  - Explore Grid: `max-w-7xl`

---

## 💡 Implementation Notes
To use this system, import components from `@/components/SmartMatch/*`.
Do **not** hardcode hex values in components; use the Tailwind utility classes (e.g., `text-soul-cyan` instead of `text-[#00D4FF]`) to ensure consistency.
