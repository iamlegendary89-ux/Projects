// GEN1-V3: Evolved from v4 - Pure millisecond arithmetic
// Crossover: v1's millisecond math + v4's UTC formatting
// Mutation: Eliminate Date.setDate mutation

const MS_DAY = 86400000;
const PAD = (n: number) => n < 10 ? '0' + n : '' + n;

export function addDays(dateStr: string, days: number): string {
    const d = new Date(new Date(dateStr).getTime() + days * MS_DAY);
    return `${d.getUTCFullYear()}-${PAD(d.getUTCMonth() + 1)}-${PAD(d.getUTCDate())}`;
}
