# SmartMatch Core Blueprint

> **Version**: 1.0 FINAL | **Status**: Canonical Specification  
> Latent Traits → Archetypes → Attributes → Adaptive Quiz

---

## Design Principles

This blueprint is:
- **Model-agnostic**: No neural inference at runtime
- **UI-agnostic**: Works with any frontend
- **Future-proof**: Extensible via data, not code

---

## 1. Latent Traits (The Irreducible Core)

### Trait Criteria
Traits must be:
- **Stable** over time
- **Predictive** of regret
- **Inferable** indirectly
- **Meaningful** — changes recommendations

### Final Trait Set (28 traits)

#### A. Usage & Load (8)
| Trait | Meaning |
|-------|---------|
| `multitaskingIntensity` | App switching, background load |
| `performanceTolerance` | Sensitivity to lag |
| `gamingLoad` | Sustained GPU/CPU demand |
| `cameraFrequency` | How often camera is used |
| `mediaConsumption` | Video / streaming intensity |
| `batteryAnxiety` | Sensitivity to charge drops |
| `storageGrowth` | Data accumulation rate |
| `thermalSensitivity` | Discomfort with heat |

#### B. Perception & Preference (7)
| Trait | Meaning |
|-------|---------|
| `visualSensitivity` | Display quality sensitivity |
| `motionSensitivity` | Jank / animation awareness |
| `audioSensitivity` | Speaker & mic importance |
| `hapticSensitivity` | Feedback importance |
| `aestheticAttachment` | Care about look/feel |
| `weightSensitivity` | Device heft sensitivity |
| `sizePreference` | Compact vs large |

#### C. Behavioral Economics (7)
| Trait | Meaning |
|-------|---------|
| `upgradeImpulse` | Likelihood to replace early |
| `valueConsciousness` | Price-performance sensitivity |
| `brandLoyalty` | Stickiness to ecosystems |
| `noveltySeeking` | Desire for new features |
| `riskAversion` | Fear of tradeoffs |
| `regretSensitivity` | Emotional impact of mistakes |
| `patience` | Willingness to tolerate friction |

#### D. Temporal Orientation (6)
| Trait | Meaning |
|-------|---------|
| `longevityBias` | Desire for long-term use |
| `futureProofing` | Concern about obsolescence |
| `softwareTrust` | Trust in updates |
| `depreciationAversion` | Sensitivity to resale loss |
| `learningTolerance` | Willingness to adapt |
| `consistencyNeed` | Desire for predictability |

### Trait Representation
```typescript
type TraitVector = Record<TraitName, number>; // normalized 0–1
```

**No embeddings. No ML at runtime.**  
Just Bayesian updates + weighted deltas.

---

## 2. Archetypes (Compression Layer)

### Purpose
Archetypes do **NOT** decide phones. They:
- Compress explanation
- Improve UX trust
- Enable storytelling

### Final Archetype Set (10)

| Archetype | Dominant Traits |
|-----------|-----------------|
| The Power User | `multitasking`, `performanceTolerance`, low `patience` |
| The Creator | `cameraFrequency`, `visualSensitivity` |
| The Minimalist | `valueConsciousness`, `longevityBias` |
| The Pragmatist | `riskAversion`, `batteryAnxiety` |
| The Aesthetic | `aestheticAttachment`, `designSensitivity` |
| The Gamer | `gamingLoad`, `thermalTolerance` |
| The Loyalist | `brandLoyalty`, `softwareTrust` |
| The Explorer | `noveltySeeking`, `upgradeImpulse` |
| The Long-Termist | `longevityBias`, `depreciationAversion` |
| The Casual | Low intensity across all |

### Projection
```
archetypeScore[a] = Σ(trait[i] × archetypeWeight[a][i])
```
Top archetype + secondary shown.

---

## 3. Attributes (Decision Surface)

### Why Attributes Exist
Phones are not personalities.  
They are **constraint satisfaction problems**.

### Final Attribute Set (7)

| Attribute | Description |
|-----------|-------------|
| `Performance` | CPU/GPU + sustained |
| `Camera` | Still + video |
| `Battery` | Endurance + anxiety |
| `Display` | Quality + comfort |
| `Software` | UX + updates |
| `Design` | Build + feel |
| `Value` | Price vs longevity |

### Trait → Attribute Synthesizer

Each attribute is a **weighted trait projection**.

```typescript
Camera =
  cameraFrequency * 0.4 +
  visualSensitivity * 0.2 +
  regretSensitivity * 0.2 +
  aestheticAttachment * 0.2
```

This layer is:
- ✅ Deterministic
- ✅ Explainable
- ✅ Adjustable via data

---

## 4. Quiz Flow (Adaptive, Server-Driven)

### Core Rules
- 12–16 questions max
- Stop when entropy < threshold
- No question measures fewer than 2 traits
- No direct "spec" questions

### Quiz Phases

#### Phase 0: Passive Signals (Optional)
- Device type
- Time-to-click
- Scroll depth
- Answer revision

*Used only as priors, never decisive.*

#### Phase 1: Broad Separation (Q1–Q5)
**Goal**: Eliminate archetype space.

Examples:
- "Your phone gets warm during normal use…"
- "A great camera is useless if battery dies early…"

#### Phase 2: Trait Resolution (Q6–Q11)
**Goal**: Refine tradeoffs.

Examples:
- Battery vs weight
- Camera vs storage
- Performance vs heat

#### Phase 3: Regret Probing (Q12–Q15)
**Goal**: Predict dissatisfaction.

Examples:
- "Six months later, what would annoy you more?"
- "Which compromise feels worse long-term?"

### Adaptive Selection Logic
```
nextQuestion = argmax_q (expected_information_gain / fatigue_penalty)
```
Stop early if converged.

---

## 5. Question Design

### Question Template
```typescript
interface Question {
  id: string;
  phase: 1 | 2 | 3;
  text: string;
  options: {
    label: string;
    delta: Partial<TraitVector>;
  }[];
}
```

### Example Question
> "Your phone battery drops to 20% by evening."

| Option | Trait Deltas |
|--------|--------------|
| "That stresses me out" | `batteryAnxiety +0.25`, `riskAversion +0.1` |
| "I just charge later" | `patience +0.2` |
| "Time to upgrade" | `upgradeImpulse +0.3` |

**No right answers. Only revealed preferences.**

---

## 6. Scoring Flow (End-to-End)

```
1. Initialize trait priors
2. For each answer:
   - Apply normalized deltas
   - Renormalize vector
   - Check convergence
3. Synthesize attributes
4. Rank phones
5. Project archetype
6. Return:
   - Matches
   - Confidence
   - Regret warnings
   - Explanation
```

---

## 7. Why This Blueprint Wins

| Property | Benefit |
|----------|---------|
| **Minimal** | No wasted abstraction |
| **Explainable** | No black-box ML at runtime |
| **Secure** | All logic server-side |
| **Cheap** | Pure math + cache |
| **Dominant** | Improves with feedback |

---

## 8. What NOT to Add

| Anti-pattern | Why |
|--------------|-----|
| Neural inference at runtime | Expensive, opaque |
| Personality tests | Irrelevant to phone choice |
| 50+ traits | Overfitting, noise |
| Client-side scoring | Security hole |
| Fancy embeddings | Unnecessary complexity |

These reduce accuracy and increase fragility.

---

## Implementation Files

| File | Purpose |
|------|---------|
| `lib/core/traits.ts` | TraitVector type + 28 trait definitions |
| `lib/core/archetypes.ts` | 10 archetypes + projection weights |
| `lib/core/synthesizer.ts` | Trait → Attribute mapping |
| `lib/quiz-actions.ts` | Quiz brain (server-side) |
| `public/questions.json` | Question bank with trait deltas |

---

*SmartMatch Core Blueprint v1.0 — The smallest system that can win.*
