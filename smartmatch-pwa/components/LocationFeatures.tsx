import React, { useState } from 'react';
import { useLocation } from '../contexts/LocationContext';

const LocationFeatures: React.FC = () => {
  const { location: ipLocation, loading: ipLoading, error: ipError } = useLocation();
  const [preciseLocation, setPreciseLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [preciseLoading, setPreciseLoading] = useState(false);
  const [preciseError, setPreciseError] = useState<string | null>(null);

  // 2. Function to get high-accuracy browser location when user clicks
  const handleGetPreciseLocation = () => {
    if (!navigator.geolocation) {
      setPreciseError('Precise location is not supported by your browser.');
      return;
    }

    setPreciseLoading(true);
    setPreciseError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPreciseLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setPreciseLoading(false);
      },
      (err) => {
        setPreciseError(`Could not get precise location: ${err.message}`);
        setPreciseLoading(false);
      }
    );
  };

  // 3. Render the UI to explain and ask for permission
  return (
    <div className="w-full max-w-4xl bg-slate-800/50 p-4 sm:p-6 rounded-2xl mb-12 text-center">
      <h3 className="text-xl font-semibold mb-3 text-cyan-300">Location-Based Results</h3>
      {ipLoading && <p className="text-slate-400">Determining your approximate location...</p>}
      {ipError && <p className="text-red-400">{ipError}</p>}
      {preciseError && <p className="text-red-400">{preciseError}</p>}
      
      {preciseLocation && (
        <p className="text-green-400">✓ Using your precise location for the best local results.</p>
      )}

      {!preciseLocation && ipLocation && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <p className="text-slate-400">Showing results for <span className="font-bold text-slate-200">{ipLocation.country}</span>.</p>
          <button onClick={handleGetPreciseLocation} disabled={preciseLoading} className="text-cyan-400 font-semibold hover:text-cyan-300 disabled:opacity-50">
            {preciseLoading ? 'Getting Location...' : 'Use Precise Location for Better Results'}
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationFeatures;
