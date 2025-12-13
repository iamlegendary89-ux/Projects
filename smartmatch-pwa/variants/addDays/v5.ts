// VARIANT 5: Pure function with new Date construction
// No mutation

export function addDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const result = new Date(Date.UTC(y!, m! - 1, d! + days));
    return result.toISOString().slice(0, 10);
}
