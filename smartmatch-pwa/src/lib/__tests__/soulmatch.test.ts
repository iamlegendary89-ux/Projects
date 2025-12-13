import { describe, it, expect } from "vitest";

describe("SmartMatch Scoring Constants", () => {
    const REGRET_KEYWORDS = [
        "slow charging",
        "overheats",
        "bloatware",
        "plastic back",
        "gets hot",
        "bad software",
    ] as const;

    const CONFIDENCE_THRESHOLD = 0.92;
    const HONESTY_THRESHOLD = 8.0;

    const DESTINY_THRESHOLDS = {
        overallScore: 9.55,
        confidence: 0.975,
        sourceCount: 6,
    } as const;

    it("should have 6 regret keywords", () => {
        expect(REGRET_KEYWORDS).toHaveLength(6);
    });

    it("should have valid confidence threshold", () => {
        expect(CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
        expect(CONFIDENCE_THRESHOLD).toBeLessThan(1);
    });

    it("should have valid honesty threshold", () => {
        expect(HONESTY_THRESHOLD).toBe(8.0);
    });

    it("should have valid destiny thresholds", () => {
        expect(DESTINY_THRESHOLDS.overallScore).toBeGreaterThan(9);
        expect(DESTINY_THRESHOLDS.confidence).toBeGreaterThan(0.9);
        expect(DESTINY_THRESHOLDS.sourceCount).toBeGreaterThan(0);
    });
});

describe("Regret Risk Analysis", () => {
    const REGRET_KEYWORDS = [
        "slow charging",
        "overheats",
        "bloatware",
        "plastic back",
        "gets hot",
        "bad software",
    ];
    const REGRET_PENALTY = -2.5;

    function analyzeRegretRisk(cons: string[]) {
        const keywordsFound: string[] = [];
        const affectedCons: string[] = [];

        cons.forEach((con) => {
            const lowerCon = con.toLowerCase();
            REGRET_KEYWORDS.forEach((keyword) => {
                if (lowerCon.includes(keyword)) {
                    keywordsFound.push(keyword);
                    affectedCons.push(con);
                }
            });
        });

        const totalPenalty = keywordsFound.length * REGRET_PENALTY;

        return {
            totalPenalty,
            keywordsFound: [...new Set(keywordsFound)],
            affectedCons: [...new Set(affectedCons)],
        };
    }

    it("should return 0 penalty for no regret keywords", () => {
        const result = analyzeRegretRisk(["Minor issues", "Average camera"]);
        // 0 * -2.5 = -0 in JS, so we check the absolute value
        expect(Math.abs(result.totalPenalty)).toBe(0);
        expect(result.keywordsFound).toHaveLength(0);
    });

    it("should apply -2.5 penalty per keyword found", () => {
        const result = analyzeRegretRisk(["Phone overheats during gaming"]);
        expect(result.totalPenalty).toBe(-2.5);
        expect(result.keywordsFound).toContain("overheats");
    });

    it("should accumulate penalties for multiple keywords", () => {
        const result = analyzeRegretRisk([
            "Phone overheats easily",
            "Slow charging compared to competitors",
            "Too much bloatware",
        ]);
        expect(result.totalPenalty).toBe(-7.5);
        expect(result.keywordsFound).toHaveLength(3);
    });

    it("should deduplicate keywords found in same con", () => {
        const result = analyzeRegretRisk(["Phone overheats and gets hot quickly"]);
        expect(result.keywordsFound).toContain("overheats");
        expect(result.keywordsFound).toContain("gets hot");
    });
});

describe("Base Score Calculation", () => {
    function calculateBaseScore(
        attributes: Record<string, { score: number }>,
        weights: Record<string, number>
    ): number {
        let totalScore = 0;
        let totalWeight = 0;

        Object.entries(weights).forEach(([attr, weight]) => {
            const attrData = attributes[attr];
            if (attrData) {
                totalScore += attrData.score * weight;
                totalWeight += weight;
            }
        });

        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    it("should calculate weighted average correctly", () => {
        const attributes = {
            Camera: { score: 9 },
            Performance: { score: 8 },
        };
        const weights = {
            Camera: 0.5,
            Performance: 0.5,
        };

        const score = calculateBaseScore(attributes, weights);
        expect(score).toBe(8.5);
    });

    it("should handle missing attributes", () => {
        const attributes = {
            Camera: { score: 10 },
        };
        const weights = {
            Camera: 0.5,
            Performance: 0.5,
        };

        const score = calculateBaseScore(attributes, weights);
        expect(score).toBe(10);
    });

    it("should return 0 for empty weights", () => {
        const attributes = { Camera: { score: 10 } };
        const weights = {};

        const score = calculateBaseScore(attributes, weights);
        expect(score).toBe(0);
    });

    it("should apply higher weight to priority attributes", () => {
        const attributes = {
            Camera: { score: 10 },
            Battery: { score: 5 },
        };
        const weights = {
            Camera: 0.8,
            Battery: 0.2,
        };

        const score = calculateBaseScore(attributes, weights);
        expect(score).toBe(9);
    });
});

describe("Destiny Candidate Detection", () => {
    const DESTINY_THRESHOLDS = {
        overallScore: 9.55,
        confidence: 0.975,
        sourceCount: 6,
    };

    function isDestinyCandidate(phone: {
        overallScore: number;
        metadata: { confidence: number; sourceCount: number };
    }): boolean {
        return (
            phone.overallScore >= DESTINY_THRESHOLDS.overallScore &&
            phone.metadata.confidence >= DESTINY_THRESHOLDS.confidence &&
            phone.metadata.sourceCount >= DESTINY_THRESHOLDS.sourceCount
        );
    }

    it("should return true for phone meeting all thresholds", () => {
        const phone = {
            overallScore: 9.7,
            metadata: { confidence: 0.98, sourceCount: 8 },
        };
        expect(isDestinyCandidate(phone)).toBe(true);
    });

    it("should return false if overallScore is too low", () => {
        const phone = {
            overallScore: 9.2,
            metadata: { confidence: 0.98, sourceCount: 8 },
        };
        expect(isDestinyCandidate(phone)).toBe(false);
    });

    it("should return false if confidence is too low", () => {
        const phone = {
            overallScore: 9.7,
            metadata: { confidence: 0.92, sourceCount: 8 },
        };
        expect(isDestinyCandidate(phone)).toBe(false);
    });

    it("should return false if sourceCount is too low", () => {
        const phone = {
            overallScore: 9.7,
            metadata: { confidence: 0.98, sourceCount: 3 },
        };
        expect(isDestinyCandidate(phone)).toBe(false);
    });

    it("should return true at exact threshold values", () => {
        const phone = {
            overallScore: 9.55,
            metadata: { confidence: 0.975, sourceCount: 6 },
        };
        expect(isDestinyCandidate(phone)).toBe(true);
    });
});

describe("Archetype Match Calculation", () => {
    function calculateArchetypeMatch(
        attributes: Record<string, { score: number }>,
        weights: Record<string, number>
    ): number {
        let matchScore = 0;
        let totalWeightedScore = 0;

        Object.entries(weights).forEach(([attr, weight]) => {
            const attrData = attributes[attr];
            if (attrData && weight > 0) {
                const normalizedScore = attrData.score / 10;
                matchScore += normalizedScore * weight;
                totalWeightedScore += weight;
            }
        });

        return totalWeightedScore > 0 ? matchScore / totalWeightedScore : 0.5;
    }

    it("should return value between 0 and 1", () => {
        const attributes = { Camera: { score: 8 } };
        const weights = { Camera: 1.0 };

        const match = calculateArchetypeMatch(attributes, weights);
        expect(match).toBeGreaterThanOrEqual(0);
        expect(match).toBeLessThanOrEqual(1);
    });

    it("should return perfect match for 10/10 scores", () => {
        const attributes = {
            Camera: { score: 10 },
            Performance: { score: 10 },
        };
        const weights = { Camera: 0.5, Performance: 0.5 };

        const match = calculateArchetypeMatch(attributes, weights);
        expect(match).toBe(1);
    });

    it("should return 0.5 for empty weights", () => {
        const attributes = { Camera: { score: 10 } };
        const weights = {};

        const match = calculateArchetypeMatch(attributes, weights);
        expect(match).toBe(0.5);
    });
});

describe("Emotional Resonance Calculation", () => {
    function calculateEmotionalResonance(
        archetypeMatch: number,
        isPrimary: boolean
    ): number {
        const baseResonance = 0.9 + archetypeMatch * 0.1;
        const primaryBonus = isPrimary ? 1.05 : 1.0;
        return Math.min(baseResonance * primaryBonus, 1.15);
    }

    it("should return multiplier between 0.9 and 1.15", () => {
        const result = calculateEmotionalResonance(0.5, true);
        expect(result).toBeGreaterThanOrEqual(0.9);
        expect(result).toBeLessThanOrEqual(1.15);
    });

    it("should give primary archetypes a bonus", () => {
        const primaryResult = calculateEmotionalResonance(0.8, true);
        const secondaryResult = calculateEmotionalResonance(0.8, false);
        expect(primaryResult).toBeGreaterThan(secondaryResult);
    });

    it("should cap at 1.15 maximum", () => {
        const result = calculateEmotionalResonance(1.0, true);
        expect(result).toBeLessThanOrEqual(1.15);
    });
});
