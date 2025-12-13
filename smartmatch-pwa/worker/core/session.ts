
import { SessionState } from './types';

// Simple in-memory store for dev/demo. 
// In prod, use KV or DO.
const store = new Map<string, SessionState>();

export const SessionStore = {
    async create(id: string, state: SessionState): Promise<void> {
        store.set(id, state);
    },

    async get(id: string): Promise<SessionState | null> {
        return store.get(id) || null;
    },

    async update(id: string, state: SessionState): Promise<void> {
        store.set(id, state);
    }
};
