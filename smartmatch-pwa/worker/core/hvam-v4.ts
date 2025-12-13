
import { SessionState, Question, PhoneProfile, RerankResult, Mindprint } from './types';
import { QUESTIONS_V4 } from '../data/questions-v4';
import { HVAM_WEIGHTS } from './hvam-config';

// --- Constants ---
const NUM_TRAITS = 28;
const MAX_QUESTIONS = 12; // Hard cap
const MIN_QUESTIONS = 10; // Soft cap if confidence is high
const CONFIDENCE_THRESHOLD = 0.85; // Stop if confidence > 85%

// Fatigue: k * (q/12)^1.8
const FATIGUE_K = 0.02;

// --- Initial State ---
export function initNewSession(sessionId: string): SessionState {
    return {
        sessionId,
        step: 0,
        mindprint: {
            mu: Array(NUM_TRAITS).fill(0.5), // Neutral start
            var: Array(NUM_TRAITS).fill(0.2), // High initial uncertainty
            sigma: Array(NUM_TRAITS).fill(Math.sqrt(0.2)) // Derived sigma
        },
        answers: {},
        dealbreakers: { // New flags
            os_only: null,
            max_size: null,
            budget_cap: null
        }
    };
}

// --- Bayesian Update ---
// --- Bayesian Update ---
export function updatePosterior(
    current: { mu: number[], var?: number[], sigma?: number[] },
    impacts: { traitIdx: number, mu: number, var: number }[]
): Mindprint {
    const newMu = [...current.mu];
    const newVar = [...(current.var || current.sigma?.map(s => s * s) || [])];

    // Ensure newVar is populated if current.var was missing
    if (newVar.length === 0 && current.mu.length > 0) {
        // Fallback or error? If we use this with pure Onyx session, var might be missing.
        // But updatePosterior is legacy. Let's assume we have var or derive it.
    }

    impacts.forEach(impact => {
        const i = impact.traitIdx;
        const muPrior = newMu[i];
        const varPrior = newVar[i];

        if (muPrior === undefined || varPrior === undefined) return;

        const muLikelihood = impact.mu;
        const varLikelihood = impact.var;

        const denom = varPrior + varLikelihood;
        if (denom === 0) return;

        newMu[i] = (muPrior * varLikelihood + muLikelihood * varPrior) / denom;
        newVar[i] = (varPrior * varLikelihood) / denom;
    });

    const newSigma = newVar.map(v => Math.sqrt(v));
    return { mu: newMu, var: newVar, sigma: newSigma };
}

// --- Entropy & Information Gain ---

function computeEntropy(sigmaSq: number[]): number {
    let totalEntropy = 0;
    for (const v of sigmaSq) {
        const safeVar = Math.max(v, 0.0001);
        totalEntropy += 0.5 * Math.log(2 * Math.PI * Math.E * safeVar);
    }
    return totalEntropy / NUM_TRAITS;
}

export function computeConfidence(sigmaOrVar: number[], isSigma = false): number {
    let meanVar: number;
    if (isSigma) {
        // input is sigma, so var = sigma^2
        meanVar = sigmaOrVar.reduce((a, b) => a + (b * b), 0) / sigmaOrVar.length;
    } else {
        meanVar = sigmaOrVar.reduce((a, b) => a + b, 0) / sigmaOrVar.length;
    }
    // Baseline var was 0.2 (neutral). If meanVar < 0.2, confidence increases.
    return Math.max(0, Math.min(1, 1 - (meanVar / 0.2)));
}

function getExpectedInformationGain(
    question: Question,
    currentMu: number[],
    currentVar: number[]
): number {
    const H_prior = computeEntropy(currentVar);
    let expectedH_post = 0;

    const optionProbs: number[] = [];

    // 1. Calculate P(option) based on distance
    question.options.forEach(opt => {
        let distSq = 0;
        let count = 0;
        opt.impacts.forEach(imp => {
            const diff = (currentMu[imp.traitIdx]!) - imp.mu;
            distSq += diff * diff;
            count++;
        });

        if (count === 0) {
            optionProbs.push(1);
        } else {
            const avgDist = distSq / count;
            optionProbs.push(Math.exp(-avgDist * 2));
        }
    });

    // Normalize Probs
    const sumProb = optionProbs.reduce((a, b) => a + b, 0);
    const normProbs = optionProbs.map(p => p / sumProb);


    // 2. Calculate Expected Posterior Entropy
    question.options.forEach((opt, idx) => {
        const prob = normProbs[idx]!;
        const post = updatePosterior({ mu: currentMu, var: currentVar }, opt.impacts);
        const H_post = computeEntropy(post.var || []);
        expectedH_post += prob * H_post;
    });

    return H_prior - expectedH_post;
}

// --- Adaptive Selection ---
export function selectNextQuestion(state: SessionState): { question: Question | null, isComplete: boolean, confidence: number } {
    const answeredIds = new Set(Object.keys(state.answers));
    const numAnswered = answeredIds.size;
    const confidence = state.mindprint.sigma ? computeConfidence(state.mindprint.sigma, true) : computeConfidence(state.mindprint.var || [], false);

    // 1. Check Fatigue / Completion Caps
    if (numAnswered >= MAX_QUESTIONS) return { question: null, isComplete: true, confidence };
    if (numAnswered >= MIN_QUESTIONS && confidence > CONFIDENCE_THRESHOLD) return { question: null, isComplete: true, confidence };

    // 2. Filter Pool
    const available = QUESTIONS_V4.filter(q => !answeredIds.has(q.id));

    // 3. Logic Phases
    if (!answeredIds.has("q_01")) return { question: QUESTIONS_V4.find(q => q.id === "q_01")!, isComplete: false, confidence };
    if (!answeredIds.has("q_03")) return { question: QUESTIONS_V4.find(q => q.id === "q_03")!, isComplete: false, confidence };

    if (numAnswered === 4) {
        const dealbreaker = available.find(q => q.category === "dealbreaker");
        if (dealbreaker) return { question: dealbreaker, isComplete: false, confidence };
    }

    const remainingDealbreakers = available.filter(q => q.category === "dealbreaker");
    if (numAnswered >= 4 && remainingDealbreakers.length > 0) {
        return { question: remainingDealbreakers[0]!, isComplete: false, confidence };
    }

    let bestQ: Question | null = null;
    let maxScore = -Infinity;

    for (const q of available) {
        if (q.category === "tie_breaker" && numAnswered < 10) continue;
        if (q.category === "dealbreaker") continue;

        const effectiveVar = state.mindprint.var || state.mindprint.sigma?.map(s => s * s) || [];
        const eig = getExpectedInformationGain(q, state.mindprint.mu, effectiveVar);
        const fatigue = FATIGUE_K * Math.pow(numAnswered / 12, 1.8);
        const score = eig - fatigue;

        if (score > maxScore) {
            maxScore = score;
            bestQ = q;
        }
    }

    if (!bestQ) {
        if (numAnswered >= 10) {
            const tb = available.find(q => q.category === "tie_breaker");
            if (tb) return { question: tb, isComplete: false, confidence };
        }
        return { question: null, isComplete: true, confidence };
    }

    return { question: bestQ, isComplete: false, confidence };
}

// --- Retrieval & Ranking ---

const ATTRIBUTES = [
    "Camera", "BatteryEndurance", "Performance", "Display", "SoftwareExperience", "DesignBuild", "LongevityValue"
];

// Math Helpers
function l2norm(v: number[]): number[] {
    const mag = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    return mag === 0 ? v : v.map(x => x / mag);
}

function dot(a: number[], b: number[]): number {
    return a.reduce((sum, v, i) => sum + v * (b[i] || 0), 0);
}

function cosineSimilarity(a: number[], b: number[]): number {
    return dot(l2norm(a), l2norm(b));
}

export function projectArchetypes(_mindprint: { mu: number[] }, archetypes: any[]): number[] {
    if (!archetypes || archetypes.length === 0) return [];
    return Array(archetypes.length).fill(1 / archetypes.length);
}

export function assembleUserVector(mindprint: { mu: number[] }): { vector: number[] } {
    // 1. Basic: User Mu
    const vector = [...mindprint.mu];

    // 2. Variance (if available) - Feature not fully implemented yet
    // const varPrior = mindprint.var;
    // if (varPrior) { ... }

    return { vector };
}

export function retrieveCandidates(
    userVector: { vector: number[] },
    phones: PhoneProfile[],
    k: number = 256
): PhoneProfile[] {
    return phones.map(p => {
        const sig = p.latentSignature || [];
        const sim = cosineSimilarity(userVector.vector, sig);
        return { phone: p, sim };
    })
        .sort((a, b) => b.sim - a.sim)
        .slice(0, k)
        .map(c => c.phone);
}

export function rerank(
    user: SessionState,
    candidates: PhoneProfile[],
    mapper: (mu: number[]) => Record<string, number>
): RerankResult[] {
    const results: RerankResult[] = [];
    const userTargets = mapper(user.mindprint.mu);

    // Weights from Config
    const { W_PSYCH, W_MAG, W_SAT } = HVAM_WEIGHTS;
    for (const phone of candidates) {
        // 1. Psych
        const psych = cosineSimilarity(user.mindprint.mu, phone.latentSignature || []);

        // 2. Mag (Attribute Distance)
        let distSq = 0;
        ATTRIBUTES.forEach(attr => {
            const u = userTargets[attr] || 0;
            const p = (phone.attributes as any)[attr] || 0;
            distSq += Math.pow(u - p, 2);
        });
        const maxDist = Math.sqrt(ATTRIBUTES.length * 100);
        const mag = Math.max(0, 1 - (Math.sqrt(distSq) / maxDist));

        // 3. Satisfaction
        let creditSum = 0;
        ATTRIBUTES.forEach(attr => {
            const u = Math.max(1, userTargets[attr] || 0);
            const p = (phone.attributes as any)[attr] || 0;
            const credit = p >= u ? 1.0 : p / u;
            creditSum += credit;
        });
        const satisfaction = creditSum / ATTRIBUTES.length;

        // Dealbreakers
        let dealbreakerFactor = 1.0;
        if (user.dealbreakers.os_only === 'ios' && phone.brand.toLowerCase() !== 'apple') dealbreakerFactor = 0;
        if (user.dealbreakers.os_only === 'android' && phone.brand.toLowerCase() === 'apple') dealbreakerFactor = 0;

        const score = (W_PSYCH * psych + W_MAG * mag + W_SAT * satisfaction) * dealbreakerFactor;

        results.push({
            phoneId: phone.id,
            score,
            components: {
                psych, mag, satisfaction,
                arch: 0,
                regret: 0
            },
            confidence: user.mindprint.sigma ? computeConfidence(user.mindprint.sigma, true) : computeConfidence(user.mindprint.var || [], false),
            explanation: {
                topContributing: [],
                matches: [],
                shortfalls: []
            }
        });
    }

    return results.sort((a, b) => b.score - a.score);
}
