// VARIANT 3: slice() instead of split() - slightly faster
// Avoids array creation

export function addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}
