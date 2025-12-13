// onyx-model.ts
// Combined module based on User Snippet containing:
// 1) questions.ts — full question pool with 28-d µ vectors
// 2) worker/scoring logic — Bayesian posterior updates, entropy, adaptive selection
// 3) archetype projection layer — 28->10 archetype mapping
// 4) 7-attribute synthesizer — 28->7 attribute mapping

// -----------------------------
// Interfaces & Helpers
// -----------------------------
export type TraitIdx = number; // 0..27

export const TRAIT_NAMES = [
    'opticalDepth', //0
    'nightPreference',
    'detailSensitivity',
    'colorAccuracyBias',
    'videoStabilityPriority',
    'enduranceBias',
    'chargingSpeedBias',
    'lowHeatTolerance',
    'thermalTolerance',
    'performanceDemand',
    'sustainedPerfDemand',
    'microStutterSensitivity',
    'ecosystemLockIn',
    'simplicityPreference',
    'taskSwitchingDemand',
    'productivityBias',
    'designSensitivity',
    'durabilityPriority',
    'sizePreferenceSmall',
    'sizePreferenceLarge',
    'longTermOwnershipBias',
    'supportHorizonSensitivity',
    'resaleAwareness',
    'featureAffinity',
    'wirelessChargeImportance',
    'displayColorPreference',
    'displayBrightnessPreference',
    'marginalGainSensitivity' //27
] as const;

export const TRAIT_COUNT = TRAIT_NAMES.length; // 28

export interface OptionImpact {
    id: string;
    label: string;
    // partial impacts map traitIndex -> µ (0..1), unspecified traits treated as neutral 0.5
    impacts: Partial<Record<number, number>>;
    // variance (sigma^2) for the likelihood — assigned by question type when building
}

export interface Question {
    id: string;
    text: string;
    type: 'discriminator' | 'clarifier' | 'dealbreaker' | 'tie_breaker';
    options: OptionImpact[];
    // ergonomics metadata
    expectedEntropyReduction?: number;
}

// Utility: build full µ vector from partial map (fill 0.5), clamp to [0.0,1.0]
export function buildMuVector(partial: Partial<Record<number, number>>): number[] {
    const v = new Array<number>(TRAIT_COUNT).fill(0.5);
    for (const [kStr, val] of Object.entries(partial)) {
        const k = Number(kStr);
        if (!Number.isFinite(k) || k < 0 || k >= TRAIT_COUNT || val === undefined) continue;
        v[k] = Math.min(1.0, Math.max(0.0, val));
    }
    return v;
}

// For debug/consistency: ensure µ values use a bounded range like [0.4,0.92] if desired
export function clampMuRange(v: number[], min = 0.4, max = 0.92): number[] {
    return v.map(x => Math.min(max, Math.max(min, x)));
}

// -----------------------------
// QPOOL: 22 Questions (IDs q02..q22). Q01 was example earlier — include it too.
// We will define each option with partial impacts; builder fills neutral traits.
// -----------------------------

export const QUESTIONS: Question[] = [];

// Helper to append question and compute option full vectors
function addQuestion(q: Question) {
    // assign option ids if missing
    // const sigma calculation moved to compilation time
    q.options = (q.options || []).map((opt, idx) => ({
        ...opt,
        id: opt.id || `${q.id}_o${idx + 1}`,
        impacts: opt.impacts || {} // as provided
    }));
    QUESTIONS.push(q);
}

// Q1 (we include). Type: discriminator
addQuestion({
    id: 'q01',
    text: 'What matters most in a phone?',
    type: 'discriminator',
    expectedEntropyReduction: 0.12,
    options: [
        {
            id: 'q01_o1', label: 'Balance everything', impacts: {
                0: 0.55, 1: 0.50, 2: 0.50, 3: 0.50, 4: 0.50, 5: 0.50, 6: 0.50, 7: 0.50, 8: 0.50, 9: 0.50, 10: 0.50, 11: 0.50, 12: 0.50, 13: 0.50, 14: 0.50, 15: 0.50, 16: 0.50, 17: 0.50, 18: 0.50, 19: 0.50, 20: 0.50, 21: 0.50, 22: 0.50, 23: 0.50, 24: 0.50, 25: 0.50, 26: 0.50, 27: 0.50
            }
        },
        { id: 'q01_o2', label: 'Camera quality', impacts: { 0: 0.82, 1: 0.75, 2: 0.78, 3: 0.80, 4: 0.70 } },
        { id: 'q01_o3', label: 'Battery life', impacts: { 5: 0.85, 7: 0.60, 6: 0.45 } },
        { id: 'q01_o4', label: 'Speed & smoothness', impacts: { 9: 0.88, 10: 0.80, 11: 0.72 } },
        { id: 'q01_o5', label: 'Long-term value', impacts: { 20: 0.82, 21: 0.78, 22: 0.72 } }
    ]
});

// Q2 — "How do you usually use your phone?" (discriminator)
addQuestion({
    id: 'q02', text: 'How do you usually use your phone?', type: 'discriminator', expectedEntropyReduction: 0.11,
    options: [
        { id: 'q02_o1', label: 'Social + browsing', impacts: { 13: 0.72, 25: 0.60, 26: 0.60 } },
        { id: 'q02_o2', label: 'Photography / content creation', impacts: { 0: 0.82, 2: 0.78, 1: 0.75, 3: 0.80, 4: 0.70 } },
        { id: 'q02_o3', label: 'Gaming', impacts: { 9: 0.88, 10: 0.90, 8: 0.78, 11: 0.85 } },
        { id: 'q02_o4', label: 'Work & productivity', impacts: { 14: 0.82, 15: 0.85, 12: 0.72 } },
        { id: 'q02_o5', label: 'Calling / messaging mostly', impacts: { 13: 0.88, 5: 0.70, 20: 0.78 } }
    ]
});

// Q3 — "What annoys you the most?" (discriminator)
addQuestion({
    id: 'q03', text: 'What annoys you the most?', type: 'discriminator', expectedEntropyReduction: 0.11,
    options: [
        { id: 'q03_o1', label: 'Lag or stutter', impacts: { 11: 0.90, 9: 0.82, 14: 0.72 } },
        { id: 'q03_o2', label: 'Weak battery', impacts: { 5: 0.88, 7: 0.75, 6: 0.72 } },
        { id: 'q03_o3', label: 'Poor camera', impacts: { 2: 0.85, 0: 0.82, 1: 0.83 } },
        { id: 'q03_o4', label: 'Complicated UI', impacts: { 13: 0.90, 12: 0.78 } },
        { id: 'q03_o5', label: 'Short lifespan', impacts: { 17: 0.88, 20: 0.80, 21: 0.78 } }
    ]
});

// Q4 — "Your ideal phone feel?" (discriminator)
addQuestion({
    id: 'q04', text: 'Your ideal phone feel?', type: 'discriminator', expectedEntropyReduction: 0.10,
    options: [
        { id: 'q04_o1', label: 'Sleek / premium', impacts: { 16: 0.90 } },
        { id: 'q04_o2', label: 'Rugged / durable', impacts: { 17: 0.88 } },
        { id: 'q04_o3', label: "Doesn't matter", impacts: { 16: 0.55 } },
        { id: 'q04_o4', label: 'Light and compact', impacts: { 18: 0.90 } }
    ]
});

// Q5 — Heat tolerance (clarifier)
addQuestion({
    id: 'q05', text: 'Your phone gets warm during extended use. How do you react?', type: 'clarifier', expectedEntropyReduction: 0.08,
    options: [
        { id: 'q05_o1', label: 'I stop using it immediately', impacts: { 7: 0.90, 17: 0.30, 5: 0.60 } },
        { id: 'q05_o2', label: "I notice but keep going", impacts: { 8: 0.90, 10: 0.40, 20: 0.40 } },
        { id: 'q05_o3', label: "I don't even notice", impacts: { 8: 0.60, 11: 0.40 } }
    ]
});

// Q6 — Night photography (clarifier)
addQuestion({
    id: 'q06', text: 'Do you shoot at night often?', type: 'clarifier', expectedEntropyReduction: 0.07,
    options: [
        { id: 'q06_o1', label: 'Frequently', impacts: { 1: 0.90, 0: 0.82, 4: 0.72 } },
        { id: 'q06_o2', label: 'Sometimes', impacts: { 1: 0.70 } },
        { id: 'q06_o3', label: 'Rarely', impacts: { 1: 0.55 } }
    ]
});

// Q7 — Multitasking load (clarifier)
addQuestion({
    id: 'q07', text: 'How much do you multitask on your phone?', type: 'clarifier', expectedEntropyReduction: 0.07,
    options: [
        { id: 'q07_o1', label: 'Heavy multitasking', impacts: { 14: 0.90, 10: 0.78 } },
        { id: 'q07_o2', label: 'Moderate', impacts: { 14: 0.72 } },
        { id: 'q07_o3', label: 'Minimal', impacts: { 13: 0.80 } }
    ]
});

// Q8 — Pay for longevity (clarifier)
addQuestion({
    id: 'q08', text: 'Would you pay more for a phone that lasts longer?', type: 'clarifier', expectedEntropyReduction: 0.06,
    options: [
        { id: 'q08_o1', label: 'Yes', impacts: { 21: 0.90, 20: 0.85, 22: 0.78 } },
        { id: 'q08_o2', label: 'Maybe', impacts: { 20: 0.70 } },
        { id: 'q08_o3', label: 'No', impacts: { 27: 0.80 } }
    ]
});

// Q9 — Wireless charging (clarifier)
addQuestion({
    id: 'q09', text: 'Is wireless charging important to you?', type: 'clarifier', expectedEntropyReduction: 0.05,
    options: [
        { id: 'q09_o1', label: 'Important', impacts: { 24: 0.88, 23: 0.78 } },
        { id: 'q09_o2', label: 'Nice to have', impacts: { 24: 0.68 } },
        { id: 'q09_o3', label: "Don't care", impacts: { 24: 0.50 } }
    ]
});

// Q10 — Screen preference (clarifier)
addQuestion({
    id: 'q10', text: 'Which screen type do you prefer?', type: 'clarifier', expectedEntropyReduction: 0.06,
    options: [
        { id: 'q10_o1', label: 'Vibrant / saturated', impacts: { 25: 0.88 } },
        { id: 'q10_o2', label: 'Natural / accurate', impacts: { 3: 0.78, 25: 0.65 } },
        { id: 'q10_o3', label: 'No preference', impacts: { 25: 0.55 } }
    ]
});

// Q11 — Ownership duration (clarifier)
addQuestion({
    id: 'q11', text: 'How long do you typically keep a phone?', type: 'clarifier', expectedEntropyReduction: 0.06,
    options: [
        { id: 'q11_o1', label: '3–5 years', impacts: { 20: 0.90, 17: 0.78 } },
        { id: 'q11_o2', label: '2 years', impacts: { 20: 0.70 } },
        { id: 'q11_o3', label: 'Under 1 year', impacts: { 27: 0.88 } }
    ]
});

// Q12 — Video usage (clarifier)
addQuestion({
    id: 'q12', text: 'Do you record a lot of video?', type: 'clarifier', expectedEntropyReduction: 0.06,
    options: [
        { id: 'q12_o1', label: 'Heavy video user', impacts: { 4: 0.90, 3: 0.80 } },
        { id: 'q12_o2', label: 'Sometimes', impacts: { 4: 0.70 } },
        { id: 'q12_o3', label: 'Rarely', impacts: { 4: 0.55 } }
    ]
});

// Q13 — Size comfort (clarifier)
addQuestion({
    id: 'q13', text: 'What phone size do you prefer?', type: 'clarifier', expectedEntropyReduction: 0.06,
    options: [
        { id: 'q13_o1', label: 'Small / compact', impacts: { 18: 0.92 } },
        { id: 'q13_o2', label: 'Medium', impacts: {} },
        { id: 'q13_o3', label: 'Large', impacts: { 19: 0.92 } }
    ]
});

// Q14 — Gaming frequency (clarifier)
addQuestion({
    id: 'q14', text: 'How often do you play games on your phone?', type: 'clarifier', expectedEntropyReduction: 0.06,
    options: [
        { id: 'q14_o1', label: 'Daily / heavy', impacts: { 9: 0.90, 10: 0.90, 8: 0.82 } },
        { id: 'q14_o2', label: 'Occasionally', impacts: { 10: 0.72 } },
        { id: 'q14_o3', label: 'Rarely', impacts: { 5: 0.72 } }
    ]
});

// Q15 — Rapid app switching (clarifier)
addQuestion({
    id: 'q15', text: 'Do you switch between apps very quickly?', type: 'clarifier', expectedEntropyReduction: 0.05,
    options: [
        { id: 'q15_o1', label: 'Yes', impacts: { 14: 0.90 } },
        { id: 'q15_o2', label: 'Sometimes', impacts: { 14: 0.72 } },
        { id: 'q15_o3', label: 'No', impacts: { 13: 0.78 } }
    ]
});

// Q16 — OS update importance (clarifier)
addQuestion({
    id: 'q16', text: 'How important are OS updates / years of support?', type: 'clarifier', expectedEntropyReduction: 0.05,
    options: [
        { id: 'q16_o1', label: 'Very important', impacts: { 21: 0.92 } },
        { id: 'q16_o2', label: 'Somewhat', impacts: { 21: 0.75 } },
        { id: 'q16_o3', label: 'Not important', impacts: { 21: 0.55 } }
    ]
});

// Q17 — Dealbreaker: OS (dealbreaker)
addQuestion({
    id: 'q17', text: 'Which operating system must your phone have?', type: 'dealbreaker', expectedEntropyReduction: 0.02,
    options: [
        { id: 'q17_o1', label: 'iOS only', impacts: {} },
        { id: 'q17_o2', label: 'Android only', impacts: {} },
        { id: 'q17_o3', label: 'No preference', impacts: {} }
    ]
});

// Q18 — Dealbreaker: Max size (dealbreaker)
addQuestion({
    id: 'q18', text: 'Maximum comfortable phone size?', type: 'dealbreaker', expectedEntropyReduction: 0.02,
    options: [
        { id: 'q18_o1', label: 'Compact', impacts: {} },
        { id: 'q18_o2', label: 'Medium', impacts: {} },
        { id: 'q18_o3', label: 'Large', impacts: {} }
    ]
});

// Q19 — Budget cap (dealbreaker / clarifier)
addQuestion({
    id: 'q19', text: 'Which price range do you plan to buy in?', type: 'dealbreaker', expectedEntropyReduction: 0.03,
    options: [
        { id: 'q19_o1', label: 'Under $300', impacts: {} },
        { id: 'q19_o2', label: '$300–600', impacts: {} },
        { id: 'q19_o3', label: '$600–900', impacts: {} },
        { id: 'q19_o4', label: '$900+', impacts: {} }
    ]
});

// Q20 — Tie-breaker priority (tie-breaker)
addQuestion({
    id: 'q20', text: 'Which matters more: Smoothness, Battery, or Camera?', type: 'tie_breaker', expectedEntropyReduction: 0.04,
    options: [
        { id: 'q20_o1', label: 'Smoothness', impacts: { 11: 0.92, 9: 0.85 } },
        { id: 'q20_o2', label: 'Battery', impacts: { 5: 0.92 } },
        { id: 'q20_o3', label: 'Camera', impacts: { 0: 0.88, 2: 0.82 } }
    ]
});

// Q21 — Aesthetic preference (tie-breaker)
addQuestion({
    id: 'q21', text: 'Which aesthetic do you prefer?', type: 'tie_breaker', expectedEntropyReduction: 0.03,
    options: [
        { id: 'q21_o1', label: 'Minimal', impacts: { 16: 0.85 } },
        { id: 'q21_o2', label: 'Bold', impacts: { 16: 0.92 } },
        { id: 'q21_o3', label: 'Don\'t care', impacts: { 16: 0.55 } }
    ]
});

// Q22 — Marginal sensitivity (tie-breaker)
addQuestion({
    id: 'q22', text: 'Are you sensitive to small improvements (e.g., 5% better camera)?', type: 'tie_breaker', expectedEntropyReduction: 0.03,
    options: [
        { id: 'q22_o1', label: 'Yes — every bit matters', impacts: { 27: 0.92 } },
        { id: 'q22_o2', label: 'Somewhat', impacts: { 27: 0.72 } },
        { id: 'q22_o3', label: 'No', impacts: { 27: 0.55 } }
    ]
});

// Finalize: expand all option partial maps into full µ vectors and annotate per-option sigma
export interface CompiledOption {
    id: string;
    label: string;
    mu: number[]; // length 28
    sigma: number; // sigma value for the likelihood
}

export interface CompiledQuestion {
    id: string;
    text: string;
    type: Question['type'];
    expectedEntropyReduction?: number;
    options: CompiledOption[];
}

export const COMPILED_QUESTIONS: CompiledQuestion[] = QUESTIONS.map(q => ({
    id: q.id,
    text: q.text,
    type: q.type,
    expectedEntropyReduction: q.expectedEntropyReduction,
    options: (q.options || []).map(opt => {
        const mu = buildMuVector(opt.impacts || {});
        // apply reasonable clamping
        const clamped = q.type === 'discriminator' ? clampMuRange(mu, 0.40, 0.92) : q.type === 'clarifier' ? clampMuRange(mu, 0.42, 0.92) : clampMuRange(mu, 0.45, 0.92);
        const sigma = q.type === 'discriminator' ? 0.06 : q.type === 'clarifier' ? 0.04 : q.type === 'tie_breaker' ? 0.03 : 0.06;
        return { id: opt.id, label: opt.label, mu: clamped, sigma };
    })
})) as CompiledQuestion[];

// -----------------------------
// B. Cloudflare Worker scoring logic (server-side core functions)
// -----------------------------

export interface Mindprint {
    mu: number[]; // 28
    sigma: number[]; // 28
}

export function initNeutralMindprint(): Mindprint {
    return {
        mu: new Array(TRAIT_COUNT).fill(0.5),
        sigma: new Array(TRAIT_COUNT).fill(0.5) // Increased from 0.33 to 0.5 (Var 0.25) to prevent premature confidence
    };
}

// Gaussian conjugate update per trait
export function gaussianUpdate(priorMu: number, priorSigma: number, likeMu: number, likeSigma: number): { mu: number; sigma: number } {
    const priorVar = priorSigma * priorSigma;
    const likeVar = likeSigma * likeSigma;
    const postVar = 1 / (1 / priorVar + 1 / likeVar);
    const postMu = postVar * (priorMu / priorVar + likeMu / likeVar);
    // clamp
    const muClamped = Math.min(1, Math.max(0, postMu));
    const sigmaClamped = Math.min(0.5, Math.max(0.03, Math.sqrt(postVar)));
    return { mu: muClamped, sigma: sigmaClamped };
}

// Update full mindprint with one option (apply only to impacted traits — but option mu includes all traits)
export function updateMindprint(prior: Mindprint, optionMu: number[], optionSigma: number): Mindprint {
    const next: Mindprint = { mu: [...prior.mu], sigma: [...prior.sigma] };
    for (let i = 0; i < TRAIT_COUNT; i++) {
        // Treat optionMu[i] as likelihood mean & optionSigma as sigma
        const upd = gaussianUpdate(prior.mu[i] ?? 0, prior.sigma[i] ?? 1, optionMu[i] ?? 0, optionSigma);
        next.mu[i] = upd.mu;
        next.sigma[i] = upd.sigma;
    }
    return next;
}

// Entropy per trait (Gaussian)
export function traitEntropy(sigma: number): number {
    return 0.5 * Math.log(2 * Math.PI * Math.E * sigma * sigma + 1e-12);
}

export function totalEntropy(m: Mindprint): number {
    let sum = 0;
    for (let i = 0; i < TRAIT_COUNT; i++) sum += traitEntropy(m.sigma[i] ?? 1);
    return sum / TRAIT_COUNT; // mean entropy
}

export function overallConfidenceFromMindprint(m: Mindprint, priorEntropy?: number): number {
    const ent = totalEntropy(m);
    // Base entropy (Sigma=0.5) ~ 0.72
    const base = priorEntropy ?? (0.5 * Math.log(2 * Math.PI * Math.E * 0.5 * 0.5));
    // Min entropy (Sigma=0.03) ~ -1.78 (Target for 100% confidence)
    const minEnt = 0.5 * Math.log(2 * Math.PI * Math.E * 0.03 * 0.03);

    // Linear map: Base -> 0, Min -> 1
    // Conf = (Base - Ent) / (Base - Min)
    const conf = (base - ent) / (base - minEnt);

    return Math.min(1.0, Math.max(0.0, conf));
}

// Expected information gain approximate for a question (fast heuristic):
// EIG ≈ sum_over_options P(opt) * (entropy_before - entropy_after_opt)
// We approximate P(opt) by similarity of current mu to option.mu
export function approxChoiceProbability(curMu: number[], optMu: number[], temp = 0.08): number {
    // negative squared L2 distance -> softmax
    let dist = 0;
    for (let i = 0; i < TRAIT_COUNT; i++) {
        const d = (curMu[i] ?? 0) - (optMu[i] ?? 0);
        dist += d * d;
    }
    return Math.exp(-dist / temp);
}

export function expectedInfoGain(question: CompiledQuestion, cur: Mindprint): number {
    const Hbefore = totalEntropy(cur);
    // compute normalization denom for probabilities
    const probs = question.options.map(opt => approxChoiceProbability(cur.mu, opt.mu));
    const sumP = probs.reduce((a, b) => a + b, 0) || 1;
    let expHafter = 0;
    for (let i = 0; i < question.options.length; i++) {
        const p = (probs[i] ?? 0) / sumP;
        const opt = question.options[i];
        if (!opt) continue;
        const simulated = updateMindprint(cur, opt.mu, opt.sigma);
        const Hafter = totalEntropy(simulated);
        expHafter += p * Hafter;
    }
    return Hbefore - expHafter;
}

// Select next question from candidate pool given current mindprint and answered IDs
export function selectNextQuestion(
    allQuestions: CompiledQuestion[],
    cur: Mindprint,
    answeredIds: string[]
): CompiledQuestion | null {
    const answeredSet = new Set(answeredIds);
    const numAnswered = answeredSet.size;

    // 1. Force start with Q01 (if not answered)
    if (!answeredSet.has('q01')) {
        return allQuestions.find(q => q.id === 'q01') || null;
    }
    // 2. Force Q02, Q03 (Logic Phases)
    if (!answeredSet.has('q02')) return allQuestions.find(q => q.id === 'q02') || null;
    if (!answeredSet.has('q03')) return allQuestions.find(q => q.id === 'q03') || null;

    // Stop if confidence high
    const conf = overallConfidenceFromMindprint(cur);
    if (numAnswered >= 10 && conf >= 0.85) return null; // Only stop early if >=10 answered
    if (numAnswered >= 18) return null; // Hard cap

    // Filter candidates
    const candidates = allQuestions.filter(q => !answeredSet.has(q.id));
    if (candidates.length === 0) return null;

    let best: CompiledQuestion | null = null;
    let bestScore = -Infinity;

    for (const q of candidates) {
        // Skip tie-breakers early on
        if (q.type === 'tie_breaker' && numAnswered < 8) continue;

        const eig = expectedInfoGain(q, cur);
        // fatigue penalty
        const fatigue = 0.02 * Math.pow(numAnswered / 12, 1.8);
        const score = eig - fatigue;
        if (score > bestScore) { bestScore = score; best = q; }
    }

    // Fallback if no best found (e.g. only tie breakers left and < 8 answered - unlikely but possible)
    if (!best && candidates.length > 0) return candidates[0] || null;

    return best;
}

// -----------------------------
// C. Archetype projection layer (28 -> 10 archetypes)
// -----------------------------
export const ARCHETYPE_NAMES = [
    'Photographer', 'Gamer', 'Traveler', 'Minimalist', 'BudgetMax', 'PowerUser', 'DurabilitySeeker', 'SocialSharer', 'ContentCreator', 'EarlyAdopter'
];
export const ARCHETYPE_COUNT = ARCHETYPE_NAMES.length;

// Archetype matrix: archetypeIdx -> 28 trait weights (values 0..1).
// These are hand-designed signatures normalized per archetype.
export const ARCHETYPE_MATRIX: number[][] = (() => {
    const zero = new Array<number>(TRAIT_COUNT).fill(0);
    const make = (map: Partial<Record<number, number>>) => {
        const v = [...zero];
        for (const kStr of Object.keys(map)) {
            const k = Number(kStr);
            v[k] = map[k] ?? 0;
        }
        // normalize to sum 1
        const sum = v.reduce((a, b) => a + b, 0) || 1;
        return v.map(x => x / sum);
    };

    return [
        // Photographer
        make({ 0: 0.20, 1: 0.18, 2: 0.16, 3: 0.12, 4: 0.10, 25: 0.06, 26: 0.06, 23: 0.12 }),
        // Gamer
        make({ 9: 0.30, 10: 0.25, 11: 0.12, 8: 0.10, 14: 0.08, 27: 0.05, 23: 0.10 }),
        // Traveler
        make({ 5: 0.22, 20: 0.20, 17: 0.18, 6: 0.12, 24: 0.10, 26: 0.08 }),
        // Minimalist
        make({ 13: 0.30, 12: 0.15, 16: 0.10, 18: 0.10, 27: 0.10, 23: 0.25 }),
        // BudgetMax
        make({ 22: 0.30, 20: 0.18, 5: 0.12, 9: 0.10, 27: 0.10, 23: 0.20 }),
        // PowerUser
        make({ 9: 0.20, 10: 0.18, 14: 0.12, 15: 0.12, 11: 0.08, 12: 0.10, 27: 0.20 }),
        // DurabilitySeeker
        make({ 17: 0.40, 20: 0.20, 21: 0.10, 5: 0.10, 16: 0.10, 18: 0.10 }),
        // SocialSharer
        make({ 13: 0.18, 25: 0.18, 0: 0.12, 23: 0.10, 4: 0.10, 2: 0.12, 26: 0.10 }),
        // ContentCreator
        make({ 0: 0.18, 2: 0.16, 4: 0.16, 3: 0.12, 25: 0.10, 1: 0.10, 27: 0.08 }),
        // EarlyAdopter
        make({ 27: 0.30, 12: 0.12, 20: 0.10, 9: 0.10, 21: 0.08, 23: 0.10 })
    ];
})();

// Project mindprint.mu -> archetype scores (softmax)
export function projectArchetypes(mu: number[], temperature = 1.0): { scores: number[], topIdx: number } {
    const logits = ARCHETYPE_MATRIX.map(row => row.reduce((sum, w, i) => sum + w * (mu[i] ?? 0), 0));
    // softmax
    const exps = logits.map(l => Math.exp(l / temperature));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    const probs = exps.map(e => e / sum);
    let topIdx = 0;
    for (let i = 1; i < probs.length; i++) {
        if ((probs[i] ?? 0) > (probs[topIdx] ?? 0)) topIdx = i;
    }
    return { scores: probs, topIdx };
}

// -----------------------------
// D. 7-attribute synthesizer (28 -> 7 attributes mapping)
// -----------------------------
export const ATTR_NAMES = ['Camera', 'BatteryEndurance', 'Performance', 'Display', 'SoftwareExperience', 'DesignBuild', 'LongevityValue'] as const;
export type AttrName = typeof ATTR_NAMES[number];

// Mapping matrix: attrIdx -> trait weights (un-normalized). We'll design plausible weights.
export const ATTR_MAPPING: number[][] = (() => {
    const zero = new Array<number>(TRAIT_COUNT).fill(0);
    const make = (map: Partial<Record<number, number>>) => {
        const v = [...zero];
        for (const kStr of Object.keys(map)) {
            const k = Number(kStr);
            v[k] = map[k] ?? 0;
        }
        // no normalization here; will compute weighted sum and rescale
        return v;
    };
    return [
        // Camera
        make({ 0: 0.28, 1: 0.22, 2: 0.18, 3: 0.12, 4: 0.10 }),
        // Battery Endurance
        make({ 5: 0.35, 6: 0.15, 7: 0.10, 8: 0.10, 20: 0.20 }),
        // Performance
        make({ 9: 0.25, 10: 0.25, 11: 0.15, 14: 0.10, 27: 0.05 }),
        // Display
        make({ 25: 0.30, 26: 0.25, 3: 0.15, 16: 0.10 }),
        // Software Experience
        make({ 12: 0.30, 13: 0.20, 15: 0.15, 21: 0.10 }),
        // Design & Build
        make({ 16: 0.30, 17: 0.30, 18: 0.10, 19: 0.10 }),
        // Longevity Value
        make({ 20: 0.30, 21: 0.25, 22: 0.20, 5: 0.10 })
    ];
})();

// Given mindprint.mu & sigma, produce attribute targets with uncertainties
export function synthesizeAttributes(mu: number[], sigma: number[]): { [k in AttrName]: { score: number; uncertainty: number } } {
    const out: any = {};
    for (let a = 0; a < ATTR_MAPPING.length; a++) {
        const weights = ATTR_MAPPING[a];
        if (!weights) continue;
        // dot product
        let val = 0; let wsum = 0;
        for (let i = 0; i < TRAIT_COUNT; i++) {
            const w = weights[i] ?? 0;
            const m = mu[i] ?? 0;
            val += w * m;
            wsum += w;
        }
        const normalized = wsum > 0 ? val / wsum : 0.5; // 0..1
        // scale to 0..10
        const score = Math.min(10, Math.max(0, +(normalized * 10).toFixed(2)));
        // uncertainty derived from trait sigmas weighted similarly
        let unc = 0; for (let i = 0; i < TRAIT_COUNT; i++) {
            const w = weights[i] ?? 0;
            const s = sigma[i] ?? 0;
            unc += w * s;
        }
        unc = wsum > 0 ? unc / wsum : 0.5; // 0..~0.5
        const uncertainty = Math.min(1, Math.max(0.03, +unc.toFixed(3)));
        const attrName = ATTR_NAMES[a];
        if (attrName) {
            out[attrName] = { score, uncertainty };
        }
    }
    return out;
}

// -----------------------------
// Export convenience: function to process an answer and compute updated profile + archetypes + attributes
// -----------------------------
export interface UserProfileRuntime {
    mindprint: Mindprint;
    archetypes: { scores: number[], topIdx: number };
    attributes: { [k in AttrName]: { score: number; uncertainty: number } };
    confidence: number;
}

export function processAnswerAndEvaluate(prior: Mindprint, questionId: string, optionId: string): UserProfileRuntime {
    const q = COMPILED_QUESTIONS.find(x => x.id === questionId);
    if (!q) throw new Error('Question not found');
    const opt = q.options.find(o => o.id === optionId);
    if (!opt) throw new Error('Option not found');
    const updated = updateMindprint(prior, opt.mu, opt.sigma);
    const arche = projectArchetypes(updated.mu);
    const attrs = synthesizeAttributes(updated.mu, updated.sigma);
    const conf = overallConfidenceFromMindprint(updated);
    return { mindprint: updated, archetypes: arche, attributes: attrs, confidence: conf };
}
