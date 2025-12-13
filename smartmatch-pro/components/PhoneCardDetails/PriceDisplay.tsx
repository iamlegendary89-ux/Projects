import React, { useState, useEffect } from 'react';

interface PriceDisplayProps {
  priceUSD: number;
  originalPriceUSD?: number;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({ priceUSD, originalPriceUSD }) => {
  const [displayPrice, setDisplayPrice] = useState<string | null>(null);
  const [originalDisplayPrice, setOriginalDisplayPrice] = useState<string | null>(null);
  const [localCurrency, setLocalCurrency] = useState<string>('USD');

  useEffect(() => {
    const convertPrices = async () => {
      try {
        // Get user's locale from the browser
        const userLocale = navigator.language || 'en-US';
        const currencyFormatter = new Intl.NumberFormat(userLocale, { style: 'currency', currency: 'USD' });
        const localCurrencyCode = currencyFormatter.resolvedOptions().currency;
        setLocalCurrency(localCurrencyCode);

        if (localCurrencyCode === 'USD') {
          setDisplayPrice(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(priceUSD));
          if (originalPriceUSD && originalPriceUSD > priceUSD) {
            setOriginalDisplayPrice(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(originalPriceUSD));
          }
          return;
        }

        // Fetch latest exchange rates from a free API
        const response = await fetch('https://api.exchangerate.host/latest?base=USD');
        if (!response.ok) throw new Error('Failed to fetch exchange rates');
        const data = await response.json();
        
        const rate = data.rates[localCurrencyCode];
        if (rate) {
          const newPrice = priceUSD * rate;
          const formattedPrice = new Intl.NumberFormat(userLocale, { style: 'currency', currency: localCurrencyCode }).format(newPrice);
          setDisplayPrice(formattedPrice);

          if (originalPriceUSD && originalPriceUSD > priceUSD) {
            const newOriginalPrice = originalPriceUSD * rate;
            const formattedOriginalPrice = new Intl.NumberFormat(userLocale, { style: 'currency', currency: localCurrencyCode }).format(newOriginalPrice);
            setOriginalDisplayPrice(formattedOriginalPrice);
          }
        } else {
          // Fallback to USD if local currency rate is not available
          setDisplayPrice(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(priceUSD));
        }
      } catch (error) {
        console.error("Price conversion failed:", error);
        // Fallback to USD on any error
        setDisplayPrice(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(priceUSD));
      }
    };

    convertPrices();
  }, [priceUSD, originalPriceUSD]);

  if (!displayPrice) {
    return <span>Loading price...</span>;
  }

  // --- New Feature: Display Discount ---
  if (originalDisplayPrice) {
    return (
      <div className="text-right">
        <span className="font-bold text-lg text-green-400">{displayPrice}</span>
        <span className="ml-2 text-sm text-slate-400 line-through">{originalDisplayPrice}</span>
      </div>
    );
  }

  if (localCurrency === 'USD') {
    return <span className="font-bold text-lg text-white">{displayPrice}</span>;
  }

  return (
    <span className="font-bold text-lg text-white">
      {displayPrice} <span className="text-sm text-slate-400">(approx. {localCurrency})</span>
    </span>
  );
};

export default PriceDisplay;
