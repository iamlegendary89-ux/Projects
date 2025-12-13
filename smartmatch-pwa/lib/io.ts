import { promises as fs } from "fs";
import path from "path";

/**
 * Safely read JSON file
 */
export async function safeReadJson<T>(filePath: string, defaultValue: T): Promise<T> {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        return JSON.parse(content) as T;
    } catch (error) {
        return defaultValue;
    }
}

/**
 * Safely write JSON file
 */
export async function safeWriteJson<T>(filePath: string, data: T): Promise<void> {
    try {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
        console.error(`Failed to write to ${filePath}:`, error);
        throw error;
    }
}
