// VARIANT 1: Millisecond arithmetic - avoids Date mutation
// More explicit calculation

const MS_PER_DAY = 86400000; // 24 * 60 * 60 * 1000

export function addDays(dateStr: string, days: number): string {
    const ms = new Date(dateStr).getTime() + days * MS_PER_DAY;
    return new Date(ms).toISOString().split("T")[0] || "";
}
