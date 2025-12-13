# LZFOF Prompt Optimization Report
**Date:** 2025-12-10  
**Model:** tngtech/deepseek-r1t2-chimera:free  
**Phones Tested:** iPhone 15 Pro, Samsung Galaxy S25

---

## Variants Tested

| Variant | Strategy | Lines |
|---------|----------|-------|
| v0-original | Production baseline | ~92 |
| v1-minimal | 40% shorter, terse | ~35 |
| v2-structured | XML tags | ~65 |
| v3-chain-of-thought | Step-by-step | ~80 |
| v4-few-shot | 2 examples | ~120 |
| v5-persona-expert | MKBHD roleplay | ~75 |
| v6-schema-first | Schema upfront | ~55 |
| v7-optimized | Calibration anchors | ~140 |

---

## iPhone 15 Pro Results

### Score Comparison (Run 1)

| Attribute | v0 | v1 | v2 | v3 | v4 | v5 | v6 | v7 |
|-----------|----|----|----|----|----|----|----|----|
| Camera | 8.00 | 9.12 | 9.00 | 8.80 | 9.35 | 9.00 | **9.45** | 9.45 |
| Battery | 6.14 | 7.50 | 7.50 | 6.90 | 7.80 | 7.50 | **8.50** | 7.50 |
| Performance | 9.04 | 9.50 | **9.80** | 9.40 | 9.65 | 8.50 | **9.80** | 9.20 |
| Display | 9.18 | 9.00 | 9.20 | 9.20 | 9.20 | 9.00 | **9.26** | 9.30 |
| Software | 8.24 | 9.00 | **9.50** | 8.50 | 9.40 | 9.00 | **9.50** | 8.90 |
| Design | 9.26 | 9.00 | 9.30 | 9.00 | 9.10 | 8.50 | **9.70** | 9.30 |
| Longevity | 6.72 | 8.00 | **9.00** | 7.80 | 8.90 | 8.00 | **9.00** | 8.20 |
| **Avg** | 8.08 | 8.73 | 9.04 | 8.51 | 9.06 | 8.50 | **9.32** | 8.84 |

### Variance Analysis (2 runs)

| Variant | Avg Δ | Zero-Variance Attrs | Max Δ |
|---------|-------|---------------------|-------|
| **v4-few-shot** | **0.00** | All 7 ✅ | 0.00 |
| v7-optimized | 0.13 | Software, Design, Longevity | 0.30 |
| v3-chain-of-thought | 0.46 | None | 0.90 |
| v2-structured | 0.63 | None | 1.00 |

---

## Samsung Galaxy S25 Results

### Head-to-Head: v0 vs v4 vs v7

| Attribute | v0 R1 | v0 R2 | v4 R1 | v4 R2 | v7 R1 | v7 R2 |
|-----------|-------|-------|-------|-------|-------|-------|
| Camera | 7.50 | 7.45 | 8.50 | 7.80 | 8.20 | 8.15 |
| Battery | 7.80 | 7.80 | 7.80 | 7.20 | 8.20 | 7.25 |
| Performance | 9.20 | 9.25 | 9.65 | 9.50 | 9.50 | 9.65 |
| Display | 8.50 | 8.55 | 9.10 | 8.90 | 9.20 | 9.35 |
| Software | 8.80 | 8.80 | 9.40 | 9.30 | 9.30 | 9.45 |
| Design | 9.00 | 8.70 | 9.00 | 8.70 | 8.50 | 8.85 |
| Longevity | 8.00 | 8.50 | 8.90 | 8.60 | 8.50 | 8.35 |

### Variance

| Variant | Avg Δ | Winner |
|---------|-------|--------|
| **v0-original** | **0.14** | ✅ Most stable on S25 |
| v7-optimized | 0.28 | |
| v4-few-shot | 0.34 | |

---

## Efficiency Metrics

| Variant | Avg Time | Completion Tokens |
|---------|----------|-------------------|
| **v4-few-shot** | **85s** | **1,700** |
| v7-optimized | 80s | 1,900 |
| v2-structured | 108s | 2,300 |
| v3-chain-of-thought | 113s | 2,200 |
| v6-schema-first | 154s | 2,544 |
| v1-minimal | 167s | 2,883 |
| v5-persona-expert | 173s | 2,544 |

---

## Key Findings

1. **v4-few-shot** achieved **zero variance** on iPhone 15 Pro
2. **v0-original** most stable on Samsung S25 (0.14 avg variance)
3. **Battery** and **Camera** show highest variance across variants
4. **Software**, **Design**, **Longevity** tend to be more stable
5. **Schema-first (v6)** scores highest but may inflate scores
6. **v7 calibration anchors** helped but didn't eliminate variance

---

## Recommendation

> **Keep v0-original for production** - proven stability across phone types
>
> For specific use cases:
> - High consistency: v4-few-shot (if data is consistent)
> - Realistic scoring: v7-optimized with 2-run averaging
> - Cost optimization: v4-few-shot (40% fewer tokens)

---

## Files

All test results saved in:
```
data/lzfof_tests/
├── LZFOF_REPORT.json          # This report as JSON
├── apple_iphone_15_pro_*.json # iPhone test results
├── samsung_galaxy_s25_*.json  # Samsung test results
└── summary_*.json             # Batch test summaries
```
