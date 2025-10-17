import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface LocationData {
  country: string;
}

interface LocationContextType {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserCountry = async () => {
      try {
        const response = await fetch('/api/location');
        if (!response.ok) {
          throw new Error('Could not fetch country location.');
        }
        const data = await response.json();
        setLocation({ country: data.country });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserCountry();
  }, []);

  return <LocationContext.Provider value={{ location, loading, error }}>{children}</LocationContext.Provider>;
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
