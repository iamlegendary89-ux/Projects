
// Worker Copy of Crypto Logic for HMAC-SHA256

export async function signRequest(
    payload: string,
    secret: string,
    timestamp: number
): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const data = encoder.encode(`${timestamp}.${payload}`);

    const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, data);

    // Convert buffer to hex string
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function verifyRequest(
    signature: string,
    payload: string,
    secret: string,
    timestamp: number
): Promise<boolean> {
    const expected = await signRequest(payload, secret, timestamp);
    return expected === signature;
}
