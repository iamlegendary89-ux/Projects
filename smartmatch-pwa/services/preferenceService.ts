/**
 * Preference service for storing and retrieving user preferences
 * Uses localStorage for now, can be extended to sync with server storage
 */

export interface UserPreferences {
  brand?: string;
  priority?: 'camera' | 'performance' | 'battery' | 'design' | 'price';
  priceRange?: { min: number; max: number };
  os?: 'iOS' | 'Android';
  lastUpdated?: string;
}

const PREFS_KEY = 'smartmatch:prefs';

/**
 * Get user preferences from localStorage
 */
export function getUserPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load preferences:', error);
    return {};
  }
}

/**
 * Save user preferences to localStorage and optionally sync to server
 */
export async function saveUserPreferences(prefs: Partial<UserPreferences>, syncToServer = false): Promise<void> {
  try {
    const current = getUserPreferences();
    const updated = {
      ...current,
      ...prefs,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));

    // Optional: sync to server for cross-device preferences
    if (syncToServer) {
      try {
        await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: getUserId(),
            preferences: updated
          }),
        });
      } catch (syncError) {
        console.warn('Failed to sync preferences to server:', syncError);
        // Don't fail local save if server sync fails
      }
    }
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

/**
 * Update specific preference fields
 */
export function updatePreferences(updates: Partial<UserPreferences>): void {
  const current = getUserPreferences();
  saveUserPreferences({ ...current, ...updates });
}

/**
 * Create a unique user ID for this session/device
 */
export function getUserId(): string {
  let userId = localStorage.getItem('smartmatch:userId');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('smartmatch:userId', userId);
  }
  return userId;
}

/**
 * Clear all user preferences
 */
export function clearPreferences(): void {
  localStorage.removeItem(PREFS_KEY);
}
