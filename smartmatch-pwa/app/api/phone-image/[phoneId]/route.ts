import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

/**
 * API route to serve phone hero images from the data directory.
 * Falls back to 404 if image not found.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ phoneId: string }> }
): Promise<NextResponse> {
    const { phoneId } = await params;

    // Check both possible locations for hero images
    const possiblePaths = [
        path.join(process.cwd(), "data", "content", phoneId, "hero_1.jpg"),
        path.join(process.cwd(), "data", "processed_content", phoneId, "hero_1.jpg"),
    ];

    let imagePath: string | null = null;
    for (const p of possiblePaths) {
        if (existsSync(p)) {
            imagePath = p;
            break;
        }
    }

    if (!imagePath) {
        return new NextResponse("Image not found", { status: 404 });
    }

    try {
        const imageBuffer = await readFile(imagePath);

        return new NextResponse(imageBuffer, {
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch {
        return new NextResponse("Error reading image", { status: 500 });
    }
}
