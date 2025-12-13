import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiting (Note: This resets on server restart/lambda cold start)
// For production, use Upstash/Redis
const RATELIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 500; // 500 requests per minute (increased for testing)
const ipRequests = new Map<string, { count: number; startTime: number }>();

export function middleware(request: NextRequest) {
    // Get client IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? 'unknown';

    // Rate limiting check
    const now = Date.now();
    const requestData = ipRequests.get(ip);

    if (requestData) {
        if (now - requestData.startTime > RATELIMIT_WINDOW) {
            // Reset window
            ipRequests.set(ip, { count: 1, startTime: now });
        } else if (requestData.count >= MAX_REQUESTS) {
            // Rate limit exceeded
            return new NextResponse('Too Many Requests', {
                status: 429,
                headers: { 'Retry-After': '60' }
            });
        } else {
            requestData.count++;
        }
    } else {
        ipRequests.set(ip, { count: 1, startTime: now });
    }

    const response = NextResponse.next();

    // Security Headers
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-Content-Type-Options', 'nosniff');

    return response;
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
