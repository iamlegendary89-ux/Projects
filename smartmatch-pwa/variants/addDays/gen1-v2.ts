// GEN1-V2: Evolved from v4 - Precomputed padding for speed
// Crossover: v4's structure + inline optimization
// Mutation: Pre-built padding lookup table

const PAD = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
    '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27',
    '28', '29', '30', '31'];

export function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return `${d.getUTCFullYear()}-${PAD[d.getUTCMonth() + 1]}-${PAD[d.getUTCDate()]}`;
}
