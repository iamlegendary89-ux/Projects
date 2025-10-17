import { Phone } from '../types';
import { UserPreferences } from './preferenceService';

/**
 * Response from the suggestion API
 */
interface SuggestResponse {
  country: string;
  region: string;
  query: string;
  results: Phone[];
  personalized: boolean;
}

/**
 * Suggests phones based on user query, country, and personal preferences
 * @param query User's search/query text
 * @param country User's country code (e.g., 'US', 'EG', 'GB')
 * @param userPrefs User's personalization preferences (optional)
 * @returns Promise resolving to array of suggested phones
 */
export async function getSuggestions(
  query: string,
  country: string = 'US',
  userPrefs: Partial<UserPreferences> = {}
): Promise<Phone[]> {
  try {
    const response = await fetch('/api/suggest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, country, userPrefs }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: SuggestResponse = await response.json();
    return data.results;

  } catch (error) {
    console.error('Failed to get suggestions:', error);
    // Fallback to empty array or could implement client-side filtering here
    return [];
  }
}
