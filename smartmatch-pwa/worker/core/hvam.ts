
import {
    Mindprint,
    SessionState,
    Question,
    Archetype,
    PhoneProfile,
    UserVector,
    RerankResult,
    ATTRIBUTES
} from './types';

// Constants
const DIMENSION = 28;
const MIN_SIGMA = 0.03;
const MAX_SIGMA = 0.5;
const ARCHETYPE_TEMP = 1.0;

// weights
const W_PSYCH = 0.40;
const W_MAG = 0.20;
const W_SAT = 0.20;
const W_ARCH = 0.15;
const W_REG = 0.15;

// Math Helpers
function ensureRange(val: number, min: number, max: number) {
    return Math.min(Math.max(val, min), max);
}

function dot(a: number[], b: number[]): number {
    return a.reduce((sum, v, i) => sum + v * (b[i] || 0), 0);
}

function l2norm(v: number[]): number[] {
    const mag = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    return mag === 0 ? v : v.map(x => x / mag);
}

function cosineSimilarity(a: number[], b: number[]): number {
    return dot(l2norm(a), l2norm(b));
}

function softmax(arr: number[]): number[] {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
}

// --- Logic ---

export function initNewSession(sessionId: string): SessionState {
    // Neutral prior
    const mu = Array(DIMENSION).fill(0.5);
    const sigma = Array(DIMENSION).fill(0.33);

    return {
        sessionId,
        step: 0,
        mindprint: { mu, sigma },
        archetypeProb: [],
        answers: {}
    };
}

export function updatePosterior(
    mindprint: Mindprint,
    impacts: { traitIdx: number; mu: number; var: number }[]
): Mindprint {
    const newMu = [...mindprint.mu];
    const newSigma = [...mindprint.sigma];

    for (const imp of impacts) {
        if (imp.traitIdx < 0 || imp.traitIdx >= DIMENSION) continue;

        const priorMu = newMu[imp.traitIdx];
        const priorSigma = newSigma[imp.traitIdx];

        // Likelihood
        const likMu = imp.mu;
        const likSigma = Math.sqrt(imp.var); // Option provides variance, we need sigma for formula if strictly following blueprint?
        // Blueprint: "option => { traitIdx: mean, variance }"
        // Blueprint Formula: 1/sigma_prior^2 + 1/sigma_likelihood^2
        // So likSigma is sqrt(variance).

        // posterior_sigma2 = 1 / (1/sigma_prior^2 + 1/sigma_likelihood^2)
        const priorPrec = 1 / (priorSigma * priorSigma);
        const likPrec = 1 / (likSigma * likSigma);
        const postSigma2 = 1 / (priorPrec + likPrec);

        // posterior_mu = posterior_sigma2 * (mu_prior/sigma_prior^2 + mu_likelihood/sigma_likelihood^2)
        const postMu = postSigma2 * (priorMu * priorPrec + likMu * likPrec);

        newMu[imp.traitIdx] = ensureRange(postMu, 0, 1);
        newSigma[imp.traitIdx] = ensureRange(Math.sqrt(postSigma2), MIN_SIGMA, MAX_SIGMA);
    }

    return { mu: newMu, sigma: newSigma };
}

export function projectArchetypes(mindprint: Mindprint, archetypes: Archetype[]): number[] {
    // Map trait means -> archetype probability via linear projection
    // Simplification: We only have 7 attributes in schema/archetypes, but 28 traits.
    // Assumption: The first 7 traits in mu correspond to the 7 canonical attributes.

    const scores = archetypes.map(arch => {
        // dot(trait_mu_vector_7, archetype_trait_matrix[a])
        let score = 0;
        ATTRIBUTES.forEach((attr, i) => {
            const traitVal = mindprint.mu[i]; // First 7 indices
            const archVal = arch.signature[attr] || 0;
            score += traitVal * archVal;
        });
        return score;
    });

    return softmax(scores.map(s => s / ARCHETYPE_TEMP));
}

export function assembleUserVector(mindprint: Mindprint, archetypeProb: number[]): UserVector {
    // U = concat(norm(archetypeProb), norm(mu)) then L2-normalize
    const muNorm = l2norm(mindprint.mu);
    const archNorm = l2norm(archetypeProb);

    return {
        vector: l2norm([...archNorm, ...muNorm])
    };
}

export function retrieveCandidates(
    userVector: UserVector,
    phones: PhoneProfile[],
    k: number = 256
): PhoneProfile[] {
    // Linear scan (Cosine similarity)

    // Determine offset for "Psych" (Attribute-based) matching.
    // Phone latent signature is 28-d (DIMENSION).
    // User vector is (Archetypes + DIMENSION).
    // So we need the LAST 28 elements of the user vector.
    const vectorLen = userVector.vector.length;
    const offset = Math.max(0, vectorLen - DIMENSION);

    const candidates = phones.map(p => {
        // Slice the user vector to match phone latent dimension
        const userPsychVector = userVector.vector.slice(offset);
        const sim = cosineSimilarity(userPsychVector, p.latentSignature);

        return { phone: p, sim };
    });

    return candidates
        .sort((a, b) => b.sim - a.sim)
        .slice(0, k)
        .map(c => c.phone);
}

// Special override for "UserVector" usage in retrieval: 
// I will export a helper that produces the vector comparable to phones.
export function getUserCompVector(mindprint: Mindprint): number[] {
    return mindprint.mu;
}

export function rerank(
    user: SessionState,
    candidates: PhoneProfile[],
    mapper: (mu: number[]) => Record<string, number> // mu -> user targets
): RerankResult[] {
    const results: RerankResult[] = [];

    const userTargets = mapper(user.mindprint.mu); // Get user's desired attribute scores (0-10)

    for (const phone of candidates) {
        // 1. Psych (Cosine of latent)
        // Using 28d
        const psychRaw = cosineSimilarity(user.mindprint.mu, phone.latentSignature);
        const psych = ensureRange(psychRaw, 0, 1); // map -1..1 to 0..1? usually cosine is 0..1 for positive vectors.

        // 2. Mag (Euclidean distance of attributes)
        // "1 - (euclidean_norm(normUserAttr - normPhoneAttr) / maxDist)"
        // Attributes 0-10.
        let distSq = 0;
        ATTRIBUTES.forEach(attr => {
            const u = userTargets[attr] || 0;
            const p = phone.attributes[attr] || 0;
            distSq += Math.pow(u - p, 2);
        });
        const dist = Math.sqrt(distSq);
        const maxDist = Math.sqrt(ATTRIBUTES.length * 100); // max diff is 10 per attr
        const mag = Math.max(0, 1 - (dist / maxDist));

        // 3. Satisfaction
        // "weighted_mean_per_attr( credit ) where credit = phoneAttr >= userTarget ? 1 : phoneAttr/userTarget"
        let creditSum = 0;
        ATTRIBUTES.forEach(attr => {
            const u = Math.max(0.1, userTargets[attr] || 0); // avoid div/0
            const p = phone.attributes[attr] || 0;
            const credit = p >= u ? 1.0 : p / u;
            creditSum += credit;
        });
        const satisfaction = creditSum / ATTRIBUTES.length; // uniform weights for now

        // 4. Arch (Archetype alignment)
        // "dot(user.archetypeProb, phone.archetypeSignature)" - phone needs archetype sig.
        // We lack phone archetype sig in schema? 
        // Schema: PhoneProfile has "latentSignature". 
        // Blueprint: "phone.archetypeSignature"
        // Let's define it as dot projected? 
        // For now, assume arch score = 0 if missing.
        const arch = 0;

        // 5. Regret
        const regret = 0; // heuristic placeholder

        const dealbreaker = 1; // logical check (e.g. price > budget)

        // Combine
        const base = W_PSYCH * psych + W_MAG * mag + W_SAT * satisfaction + W_ARCH * arch;
        const final = base * dealbreaker - W_REG * regret;

        results.push({
            phoneId: phone.id,
            score: final,
            components: { psych, mag, satisfaction, arch, regret },
            confidence: 0.8, // placeholder
            explanation: {
                topContributing: [],
                matches: [],
                shortfalls: []
            }
        });
    }

    return results.sort((a, b) => b.score - a.score);
}
