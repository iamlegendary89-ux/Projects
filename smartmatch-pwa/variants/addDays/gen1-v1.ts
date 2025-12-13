// GEN1-V1: Evolved from v4 - Added memoization for repeated date calculations
// Crossover: v4's manual formatting + v3's slice approach
// Mutation: Memoization cache for repeated calls

const cache = new Map<string, string>();

export function addDays(dateStr: string, days: number): string {
    const key = `${dateStr}:${days}`;
    if (cache.has(key)) return cache.get(key)!;

    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const result = `${y}-${m}-${day}`;

    cache.set(key, result);
    return result;
}
