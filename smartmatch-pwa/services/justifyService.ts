import { Phone } from '../types';

/**
 * Response from the justification API
 */
interface JustificationResponse {
  explanations: Array<{
    id: number;
    text: string;
  }>;
  country: string;
  region: string;
  generated: string;
}

/**
 * Generates AI-powered explanations for phone recommendations
 * @param results Array of recommended phones from suggest API
 * @param country User's country code
 * @param region User's region
 * @returns Promise resolving to structured explanations
 */
export async function getJustifications(
  results: Phone[],
  country: string,
  region: string
): Promise<Array<{ id: number; text: string }>> {
  try {
    const response = await fetch('/api/justify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ results, country, region }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: JustificationResponse = await response.json();
    return data.explanations || [];

  } catch (error) {
    console.error('Failed to get justifications:', error);
    // Return fallback explanations with category information
    return results.map((phone, index) => ({
      id: index + 1,
      text: `${phone.name} - ${phone.category || 'Recommended device'} for your location and preferences.`
    }));
  }
}
