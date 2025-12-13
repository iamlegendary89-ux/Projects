
// import { RerankResult } from '@/worker/core/types';
// Interface OnyxRecommendationResponse uses it. If this file is imported, it should be fine.
// Maybe the FILE lib/onyx-client.ts is unused? 
// build error says: lib/onyx-client.ts:2.
import { RerankResult } from '../worker/core/types';
import { signRequest } from './onyx-crypto';

const API_BASE = process.env.NEXT_PUBLIC_ONYX_API_URL;
const API_SECRET = process.env.NEXT_PUBLIC_ONYX_API_SECRET || "demo-secret";
const USE_MOCK = true; //!API_BASE || API_BASE === 'mock';

export interface OnyxSessionResponse {
    sessionId: string;
    nextQuestionId: string;
}

export interface OnyxAnswerResponse {
    nextQuestionId: string | null;
    confidence: number;
}

export interface OnyxRecommendationResponse {
    recommendations: RerankResult[];
    meta: any;
}

// Mock Data
const MOCK_QUESTIONS = [
    { id: "q_01", text: "What matters most?" },
    { id: "q_02", text: "Big screen or small?" },
    { id: "q_03", text: "Budget?" }
];

async function fetchWithSign(url: string, body: any) {
    const timestamp = Date.now();
    const payload = JSON.stringify(body);
    const signature = await signRequest(payload, API_SECRET, timestamp);

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Onyx-Timestamp': timestamp.toString(),
            'X-Onyx-Signature': signature
        },
        body: payload
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API Error: ${res.status} ${txt}`);
    }
    return res.json();
}

export const OnyxClient = {
    async startSession(context: any = {}): Promise<OnyxSessionResponse> {
        if (USE_MOCK) {
            console.log("OnyxClient: Mock startSession");
            return { sessionId: "mock_session_123", nextQuestionId: "q_01" };
        }
        return fetchWithSign(`${API_BASE}/api/session/start`, { context });
    },

    async submitAnswer(sessionId: string, questionId: string, optionId: string): Promise<OnyxAnswerResponse> {
        if (USE_MOCK) {
            console.log(`OnyxClient: Mock submitAnswer ${questionId}:${optionId}`);
            const idx = MOCK_QUESTIONS.findIndex(q => q.id === questionId);
            const nextQ = MOCK_QUESTIONS[idx + 1];
            return { nextQuestionId: nextQ ? nextQ.id : null, confidence: 0.5 + (idx * 0.1) };
        }
        return fetchWithSign(`${API_BASE}/api/session/answer`, { sessionId, questionId, optionId });
    },

    async finishSession(sessionId: string): Promise<OnyxRecommendationResponse> {
        if (USE_MOCK) {
            console.log("OnyxClient: Mock finishSession");
            return {
                recommendations: [
                    {
                        phoneId: "apple_iphone_15_pro",
                        score: 0.95,
                        components: { psych: 0.9, mag: 0.8, satisfaction: 0.9, arch: 0.1, regret: 0 },
                        confidence: 0.9,
                        explanation: { topContributing: ["Camera (95%)"], matches: ["Size"], shortfalls: [] }
                    },
                    {
                        phoneId: "samsung_galaxy_s25",
                        score: 0.92,
                        components: { psych: 0.8, mag: 0.9, satisfaction: 0.8, arch: 0.2, regret: 0 },
                        confidence: 0.85,
                        explanation: { topContributing: ["Screen (90%)"], matches: ["Power"], shortfalls: [] }
                    }
                ],
                meta: { algorithm: "MOCK_V4" }
            };
        }
        return fetchWithSign(`${API_BASE}/api/session/finish`, { sessionId });
    }
};
