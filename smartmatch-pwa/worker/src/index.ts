import { AutoRouter } from 'itty-Router';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import {
    initNeutralMindprint,
    processAnswerAndEvaluate,
    selectNextQuestion,
    COMPILED_QUESTIONS,
    projectArchetypes,
    ARCHETYPE_NAMES, // Added
    overallConfidenceFromMindprint, // Added
    synthesizeAttributes, // Added
} from '../core/onyx-model';
import {
    retrieveCandidates,
    rerank,
    assembleUserVector as assembleVectorV4
} from '../core/hvam-v4';
import { SessionStore } from '../core/session';
import { SessionState, Question } from '../core/types';
import { verifyRequest } from '../core/crypto';
import phonesMap from '../data/phones.json';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const regretMap = require('../data/regret-sentiments.json');
import { PhoneProfile } from '../core/types';

// Cast JSON import to type
const phones: PhoneProfile[] = Object.values(phonesMap) as unknown as PhoneProfile[];

const router = AutoRouter();

// CORS helper
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Onyx-Timestamp, X-Onyx-Signature',
};

// Security Middleware
const withAuth = async (request: Request, env: any) => {
    // Skip auth for OPTIONS (CORS preflight)
    if (request.method === 'OPTIONS') return;

    const signature = request.headers.get('X-Onyx-Signature');
    const timestamp = request.headers.get('X-Onyx-Timestamp');
    const secret = env.ONYX_API_SECRET || "demo-secret";

    if (!signature || !timestamp) {
        return new Response('Missing Security Headers', { status: 401, headers: corsHeaders });
    }

    // Check Replay (5 min window)
    const now = Date.now();
    const ts = parseInt(timestamp);
    if (Math.abs(now - ts) > 5 * 60 * 1000) {
        return new Response('Request Expired', { status: 401, headers: corsHeaders });
    }

    // Verify Signature
    const bodyText = await request.clone().text();

    const isValid = await verifyRequest(signature, bodyText, secret, ts);
    if (!isValid) {
        return new Response('Invalid Signature', { status: 403, headers: corsHeaders });
    }
};

// --- Endpoints ---

// Global OPTIONS handler for CORS
router.options('*', () => new Response(null, { status: 200, headers: corsHeaders }));

router.all('/api/*', withAuth);

router.post('/api/session/start', async (request, env) => {
    const sessionId = uuidv4();
    // Onyx V5 Init
    const mindprint = initNeutralMindprint();

    const state: SessionState = {
        sessionId,
        step: 0,
        mindprint,
        answers: {},
        dealbreakers: {
            os_only: null,
            max_size: null,
            budget_cap: null
        }
    };

    // Get First Question (Adaptive)
    // Pass 0 answered
    const selection = selectNextQuestion(COMPILED_QUESTIONS, state.mindprint, []);

    await SessionStore.create(sessionId, state);

    // Persist Session Start
    if (env.SUPABASE_URL && env.SUPABASE_KEY) {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
        supabase.from('onyx_sessions').insert({
            id: sessionId,
            started_at: new Date().toISOString(),
            status: 'active'
        }).then(({ error }) => {
            if (error) console.error("Supabase Session Init Error:", error);
        });
    }

    return new Response(JSON.stringify({
        sessionId,
        nextQuestionId: selection?.id || null
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

router.post('/api/session/answer', async (request) => {
    const body = await request.json() as any;
    const { sessionId, questionId, optionId } = body;

    const state = await SessionStore.get(sessionId);
    if (!state) {
        return new Response('Session not found', { status: 404, headers: corsHeaders });
    }

    // Find question and option in V5 Pool
    const question = COMPILED_QUESTIONS.find(q => q.id === questionId);

    if (question) {
        // Update State
        state.answers[questionId] = optionId;

        // V5 Update Logic (Mindprint + Archetypes + Attributes)
        try {
            const result = processAnswerAndEvaluate(state.mindprint, questionId, optionId);
            state.mindprint = result.mindprint;
            // state.archetypeProb = result.archetypes.scores; // Optional: store if needed types
        } catch (e) {
            console.error("Evaluation Error", e);
        }

        // Handle Dealbreakers (Flags) manually as they are outside the vector model
        if (question.type === 'dealbreaker') {
            if (questionId === 'q17') { // OS
                if (optionId === 'q17_o1') state.dealbreakers.os_only = 'ios';
                if (optionId === 'q17_o2') state.dealbreakers.os_only = 'android';
            }
            if (questionId === 'q18') { // Size
                if (optionId === 'q18_o1') state.dealbreakers.max_size = 'small';
                if (optionId === 'q18_o2') state.dealbreakers.max_size = 'medium';
            }
            // q19 Budget logic...
        }

        state.step++;
        await SessionStore.update(sessionId, state);
    }

    // Next question logic (Adaptive)
    const answeredIds = Object.keys(state.answers);
    const selection = selectNextQuestion(COMPILED_QUESTIONS, state.mindprint, answeredIds);

    // Calculate confidence
    const confidence = overallConfidenceFromMindprint(state.mindprint);

    return new Response(JSON.stringify({
        nextQuestionId: selection?.id || null, // selection is Question | null
        confidence
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

router.post('/api/session/finish', async (request, env) => {
    const body = await request.json() as any;
    const { sessionId } = body;

    const state = await SessionStore.get(sessionId);
    if (!state) {
        return new Response('Session not found', { status: 404, headers: corsHeaders });
    }

    // 1. Project Archetypes (using V5 logic)
    const archetypes = projectArchetypes(state.mindprint.mu);

    // 2. Assemble Vector (using V4 helper for now, compatible with mu[])
    const userVector = assembleVectorV4({ mu: state.mindprint.mu });

    // 3. Retrieval
    const candidates = retrieveCandidates(userVector, phones);

    // 4. Rerank
    const mapper = (mu: number[]) => {
        const targets: Record<string, number> = {};
        const attrs = synthesizeAttributes(mu, state.mindprint.sigma || []);

        // Map to flat object
        Object.entries(attrs).forEach(([k, v]: [string, any]) => {
            targets[k] = v.score;
        });
        return targets;
    };

    const results = rerank(state, candidates, mapper);
    // Enrich with Regret Data
    const resultsWithRegret = results.map(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sentiment = (regretMap.regretData as any)[r.phoneId];
        if (sentiment) {
            r.regretData = sentiment;
            // Also enhance the regretWarning field if it's generic
            if (!r.explanation.regretWarning && sentiment.totalRegretScore > 6) {
                // Find highest regret attribute
                let worstAttr = "";
                let maxR = 0;
                let complaints: string[] = [];
                for (const [k, v] of Object.entries(sentiment.attributes as Record<string, any>)) {
                    if (v.regretScore > maxR) {
                        maxR = v.regretScore;
                        worstAttr = k;
                        complaints = v.topComplaints;
                    }
                }
                if (maxR > 6 && complaints.length > 0) {
                    r.explanation.regretWarning = `Users warn: ${complaints[0]}`;
                }
            }
        }
        return r;
    });

    const recommendations = resultsWithRegret.slice(0, 5);

    // Persist Session Finish
    if (env.SUPABASE_URL && env.SUPABASE_KEY) {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
        // Log final state and result
        supabase.from('onyx_sessions').update({
            finished_at: new Date().toISOString(),
            status: 'completed',
            final_mindprint: state.mindprint,
            answers: state.answers,
            result_snapshot: recommendations.map(r => r.phoneId)
        }).eq('id', sessionId).then(({ error }) => {
            if (error) console.error("Supabase Session Finish Error:", error);
        });
    }

    return new Response(JSON.stringify({
        recommendations,
        meta: {
            sessionId,
            algorithm: "Onyx-V5-Reference",
            primaryArchetype: ARCHETYPE_NAMES[archetypes.topIdx]
        }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

router.post('/api/feedback', async (request, env) => {
    const body = await request.json() as any;
    const { sessionId, phoneId, rating, regret, notes } = body;

    if (env.SUPABASE_URL && env.SUPABASE_KEY) {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

        const { error } = await supabase.from('onyx_feedback').insert({
            session_id: sessionId,
            phone_id: phoneId,
            rating,
            regret_score: regret, // Mapping regret -> regret_score
            notes,
            created_at: new Date().toISOString()
        });

        if (error) {
            console.error("Supabase Feedback Error:", error);
            // Don't fail the request, but log it
        } else {
            console.log(`Feedback persisted for ${sessionId}`);
        }
    } else {
        console.warn("Supabase credentials missing in Worker environment");
    }

    return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
});


// Export default handler
export default {
    fetch: router.fetch
};
