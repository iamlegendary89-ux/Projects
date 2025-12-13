// VARIANT 3: Single chained expression
// No intermediate variables

import path from 'path';

export function normalizePath(brand: string, model: string, contentDir = './data/content'): string {
    return path.join(contentDir, [brand, model].join('_').toLowerCase().replace(/\s+/g, '_').replace(/[^\w\-_.]/g, ''));
}
