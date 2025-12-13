import fs from 'fs';
import path from 'path';

// Build-safe path resolution
const DATA_DIR = path.join(process.cwd(), 'data');
const PROCESSED_CONTENT_DIR = path.join(DATA_DIR, 'processed_content');
const INDEX_FILE = path.join(DATA_DIR, 'processed-phones.json');

// Ensure proper path resolution during build time
if (!require('fs').existsSync(INDEX_FILE)) {
    console.warn(`WARNING: Index file not found at ${INDEX_FILE}. Checking relative path...`);
}
if (!require('fs').existsSync(INDEX_FILE)) {
    console.warn(`WARNING: Index file not found at ${INDEX_FILE}. Checking relative path...`);
}

export interface PhoneData {
    brand: string;
    model: string;
    overallScore: number;
    category: string;
    onePageSummary: string;
    pros: string[];
    cons: string[];
    attributes: Record<string, { score: number; explanation: string }>;
    metadata: {
        confidence: number;
        sourceCount: number;
        processedAt: string;
    };
    // Derived/Extra fields for UI
    id: string;
    price?: string; // Placeholder for now, as it's not structured yet
    image?: string; // Placeholder
}

interface PhoneIndexEntry {
    phoneId: string;
    brand: string;
    model: string;
    filename: string;
    qualityMetrics: {
        overallScore: number;
        category: string;
    };
}

interface PhoneIndex {
    phones: Record<string, PhoneIndexEntry>;
}

// LZFOF: Pre-compiled price regex for reuse
const PRICE_RE = /\$\d{3,4}/;

// Debug flags
const DEBUG_LOGS = true;

function logError(msg: string, err?: any) {
    if (DEBUG_LOGS) {
        console.error(`[Lib/Phones] ERROR: ${msg}`, err);
    }
}

export async function getAllPhones(): Promise<PhoneData[]> {
    try {
        if (!fs.existsSync(INDEX_FILE)) {
            logError(`Index file missing at ${INDEX_FILE}`);
            return [];
        }

        // 1. Read the index file
        const indexContent = await fs.promises.readFile(INDEX_FILE, 'utf-8');
        if (!indexContent) {
            logError("Index file is empty");
            return [];
        }
        const index: PhoneIndex = JSON.parse(indexContent);
        if (!index.phones) {
            logError("Index file missing 'phones' property");
            return [];
        }

        // 2. LZFOF: Read all phone files in parallel
        const entries = Object.entries(index.phones);
        const readPromises = entries.map(async ([id, entry]) => {
            const filePath = path.join(PROCESSED_CONTENT_DIR, id, entry.filename);
            try {
                const fileContent = await fs.promises.readFile(filePath, 'utf-8');
                const json = JSON.parse(fileContent);
                return { id, data: json.data, success: true };
            } catch (e) {
                logError(`Failed to read phone ${id}`, e);
                return { id, data: null, success: false };
            }
        });

        const results = await Promise.allSettled(readPromises);
        const phones: PhoneData[] = [];

        for (const result of results) {
            if (result.status !== 'fulfilled' || !result.value.success) continue;

            const { id, data } = result.value;
            if (!data) continue;

            // LZFOF: Single stringification for price extraction
            const dataStr = JSON.stringify(data);
            const priceMatch = dataStr.match(PRICE_RE);

            phones.push({
                ...data,
                id: id,
                price: priceMatch ? priceMatch[0] : "Check Price",
                image: `/images/phones/${id}.jpg`
            });
        }

        return phones;
    } catch (error) {
        console.error("Failed to load phones:", error);
        return [];
    }
}

export async function getPhoneById(id: string): Promise<PhoneData | null> {
    try {
        const indexContent = await fs.promises.readFile(INDEX_FILE, 'utf-8');
        const index: PhoneIndex = JSON.parse(indexContent);
        const entry = index.phones[id];

        if (!entry) return null;

        const filePath = path.join(PROCESSED_CONTENT_DIR, id, entry.filename);
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        const json = JSON.parse(fileContent);
        const data = json.data;

        // LZFOF: Use pre-compiled PRICE_RE
        const dataStr = JSON.stringify(data);
        const priceMatch = dataStr.match(PRICE_RE);

        return {
            ...data,
            id: id,
            price: priceMatch ? priceMatch[0] : "Check Price",
            image: `/images/phones/${id}.jpg`
        };

    } catch (error) {
        console.error(`Failed to get phone ${id}:`, error);
        return null;
    }
}
