
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Offer {
  retailer: string;
  price: string;
  url: string;
}

interface LocalOffersDisplayProps {
  phoneId: number;
  phoneName: string;
  brand: string;
  countryCode: string | undefined;
}

const LocalOffersDisplay: React.FC<LocalOffersDisplayProps> = ({ phoneId, phoneName, brand, countryCode }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countryCode) {
      setIsLoading(false);
      return;
    }

    const fetchOffers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/get-local-offers?countryCode=${countryCode}&phoneId=${phoneId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch offers');
        }
        const data = await response.json();
        setOffers(data);
      } catch (e) {
        console.error('Primary API failed:', e);

        // Check if we're in local development
        const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

        if (isLocalDev) {
          // In local dev, show demo offers since APIs aren't available
          console.log('Local dev: Showing demo offers instead of real APIs');
          const demoOffers = [
            { retailer: 'Online Store', price: 'Check pricing', url: 'https://example.com' },
            { retailer: 'Local Dealer', price: 'Contact for quote', url: 'mailto:info@example.com' },
            { retailer: 'Marketplace', price: 'Compare prices', url: 'https://example.com/market' }
          ];
          setOffers(demoOffers);
        } else {
          // Try Gemini Pro fallback in production
          try {
            console.log('Attempting production fallback API call');
            setError(null); // Clear error for fallback attempt
            const fallbackResponse = await fetch('/api/generate-offers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phoneName, brand, countryCode })
            });
            console.log('Fallback response status:', fallbackResponse.status);
            if (fallbackResponse.ok) {
              const generatedOffers = await fallbackResponse.json();
              console.log('Fallback offers received:', generatedOffers);
              setOffers(generatedOffers);
            } else {
              console.log('Fallback response not ok');
              setError('Could not load local offers.');
            }
          } catch (fallbackError) {
            console.log('Fallback fetch failed:', fallbackError.message);
            console.error('Gemini Pro fallback failed:', fallbackError);
            setError('Could not load local offers.');
          }
        }
      }
      setIsLoading(false);
    };

    fetchOffers();
  }, [phoneId, countryCode]);

  if (!countryCode) {
    return (
      <div className="mt-4 p-4 bg-slate-800 rounded-lg text-center">
        <p className="text-slate-400">Enable location services to see local offers.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-slate-800 rounded-lg text-center">
        <p className="text-slate-300">Searching for local deals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-900/50 rounded-lg text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="mt-4 p-4 bg-slate-800 rounded-lg text-center">
        <p className="text-slate-400">No local offers found for your region.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="mt-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <h4 className="text-lg font-bold text-cyan-300 mb-3">Local Offers</h4>
      <div className="space-y-3">
        {offers.map((offer, index) => (
          <motion.a
            key={index}
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold text-white">{offer.retailer}</span>
              <span className="font-bold text-lg text-cyan-400">{offer.price}</span>
            </div>
          </motion.a>
        ))}
      </div>
    </motion.div>
  );
};

export default LocalOffersDisplay;
