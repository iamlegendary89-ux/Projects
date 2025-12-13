// VARIANT 1: Template literal with inline regex
// More readable

import path from 'path';

export function normalizePath(brand: string, model: string, contentDir = './data/content'): string {
    const clean = (s: string) => s.toLowerCase().replace(/\s+/g, '_').replace(/[^\w\-_.]/g, '');
    return path.join(contentDir, `${clean(brand)}_${clean(model)}`);
}
