// VARIANT 2: Single expression - most compact
// Chained with comma operator

export function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    return (d.setDate(d.getDate() + days), d.toISOString().slice(0, 10));
}
