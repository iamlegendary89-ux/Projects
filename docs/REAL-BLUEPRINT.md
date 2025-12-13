# R.E.A.L.™ Quiz System — Production Blueprint

> **R.E.A.L.** = Regret-Eliminating Adaptive Logic  
> **Philosophy**: Competitors ask what you want. R.E.A.L.™ asks what you'll regret.

---

## Two Modes, One Brain

| Mode | Goal | Time | Accuracy | Use Case |
|------|------|------|----------|----------|
| **Ultra-Fast** | Instant trust | 45–60s | ~91–93% | Ads, mobile, cold users |
| **Gold Standard** | Maximum confidence | 90–120s | ~97–98% | Power users, organic |

Both use the same latent trait space.  
Gold Standard is Ultra-Fast + refinement, not a different system.

---

## Latent Trait Space (28 Traits)

### Core Trait Groups

| Group | Traits |
|-------|--------|
| **Power & Stability** | `lagSensitivity`, `thermalTolerance`, `performanceFloor` |
| **Energy & Endurance** | `batteryStress`, `chargingAnxiety`, `endurancePriority` |
| **Visual Perception** | `displaySensitivity`, `cameraReliance`, `visualAcuity` |
| **Longevity & Regret** | `upgradeHorizon`, `buyerRemorse`, `regretAversion` |
| **Behavioral Risk** | `specChasing`, `brandTrust`, `riskProfile` |
| **Practical Constraints** | `storageAnxiety`, `pricePain`, `valueElasticity` |

All questions update a **posterior trait vector**, not feature weights.

---

## Ultra-Fast Mode (9 Questions)

### Design Rule
Every question must:
- ✅ Shift ≥ 2 major traits
- ✅ Reduce ≥ 1 future regret vector
- ✅ Have low cognitive load

### Questions

| Q# | Question | Core Traits | Impact |
|----|----------|-------------|--------|
| **Q1** | Battery Stress | `batteryStress`, `chargingAnxiety`, `endurancePriority` | MANDATORY |
| **Q2** | Lag Intolerance | `lagSensitivity`, `performanceFloor`, `toleranceVariance` | |
| **Q3** | Camera Trust | `cameraReliance`, `consistencyBias`, `lowLightExpectation` | |
| **Q4** | Regret Orientation | `regretAversion`, `riskProfile`, `overbuyPenalty` | **CORE REAL™** |
| **Q5** | Upgrade Horizon | `longevityExpectation`, `depreciationSensitivity`, `OSSupportWeight` | |
| **Q6** | Performance vs Stability | `benchmarkBias`, `thermalTolerance`, `sustainedPerfWeight` | |
| **Q7** | Storage Pressure | `storageAnxiety`, `futureGrowthWeight` | |
| **Q8** | Software Trust | `OSRiskTolerance`, `brandTrustWeight` | |
| **Q9** | Final Regret Check | `posteriorConfidence`, `convergenceScore` | **GATE** |

> 📌 Q9 allows early stop at Q8 if `convergence > threshold`

---

## Gold Standard Mode (15 Questions)

### Philosophy
Gold Standard:
- Refines edge cases
- Disambiguates similar archetypes
- Reduces long-tail regret

### Gold Standard = Ultra-Fast + 6 Refiners

| Q# | Question | Adds |
|----|----------|------|
| **Q10** | Heat Tradeoff | `thermalAversion`, `sustainedLoadBias` |
| **Q11** | Display Sensitivity | `visualAcuity`, `displayPriority` |
| **Q12** | Weight Sensitivity | `ergonomicsWeight` |
| **Q13** | Price Pain Threshold | `priceElasticity`, `valueSensitivity` |
| **Q14** | Ecosystem Lock-In | `ecosystemGravity`, `accessoryLockIn` |
| **Q15** | Regret Confirmation | `posteriorLock`, `confidenceBoost` | **FINAL LOCK** |

---

## Adaptive Flow Logic

```typescript
if (convergenceScore > 0.92 && mode === 'ultra-fast') {
  finishEarly();
}

if (posteriorEntropy > threshold && mode === 'gold') {
  injectDisambiguationQuestion();
}
```

- No fixed order past Q5
- Questions selected by expected information gain

---

## Archetype Projection (10 Archetypes)

| Archetype | Dominant Traits |
|-----------|-----------------|
| The Stabilizer | Low `lagSensitivity`, high `consistencyBias` |
| The Endurer | High `batteryStress`, `endurancePriority` |
| The Visualist | High `cameraReliance`, `visualAcuity` |
| The Minimalist | High `valueElasticity`, low `specChasing` |
| The Power Casual | Moderate all, high `thermalTolerance` |
| The Spec Chaser | High `benchmarkBias`, `specChasing` |
| The Regret-Averse | High `regretAversion`, `riskProfile` |
| The Loyalist | High `brandTrust`, `ecosystemGravity` |
| The Value Maximizer | High `pricePain`, `valueElasticity` |
| The Future-Proofer | High `longevityExpectation`, `OSSupportWeight` |

Users never see the math — only the story.

---

## Why This Dominates

| Property | Benefit |
|----------|---------|
| Ultra-Fast | Converts skeptics |
| Gold Standard | Creates believers |
| Regret-first | Defensible moat |
| Measurable harm | Removing any CORE question degrades accuracy |

---

*R.E.A.L.™ Quiz System — Production Blueprint v1.0*
