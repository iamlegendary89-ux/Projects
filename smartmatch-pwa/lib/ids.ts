import { v4 as uuidv4 } from 'uuid';

/**
 * Create a canonical ID for a resource
 * @param prefix - Prefix for the ID
 * @param namespace - Namespace for the ID (optional)
 * @returns string - Canonical ID
 */
export function createCanonicalId(prefix: string, namespace?: string): string {
    const uuid = uuidv4();
    if (namespace) {
        return `${namespace}:${prefix}:${uuid}`;
    }
    return `${prefix}:${uuid}`;
}
