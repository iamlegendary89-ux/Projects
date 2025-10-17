/**
 * Location service for detecting user country via Vercel serverless API
 */
export async function getUserCountry(): Promise<string> {
  try {
    const response = await fetch('/api/location');
    const data = await response.json();
    return data.country || 'Unknown';
  } catch (error) {
    console.warn('Failed to detect user location:', error);
    return 'Unknown';
  }
}
