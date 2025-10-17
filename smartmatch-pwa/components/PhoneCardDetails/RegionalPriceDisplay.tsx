import React from 'react';
import { RegionalPrices } from '../../types';

interface RegionalPriceDisplayProps {
  regionalPrices?: RegionalPrices;
  countryCode?: string | null;
}

const currencyMap: { [key: string]: 'EUR' | 'GBP' | 'INR' } = {
  // Eurozone countries
  'AT': 'EUR', 'BE': 'EUR', 'CY': 'EUR', 'EE': 'EUR', 'FI': 'EUR', 'FR': 'EUR', 'DE': 'EUR', 'GR': 'EUR', 'IE': 'EUR', 'IT': 'EUR', 'LV': 'EUR', 'LT': 'EUR', 'LU': 'EUR', 'MT': 'EUR', 'NL': 'EUR', 'PT': 'EUR', 'SK': 'EUR', 'SI': 'EUR', 'ES': 'EUR',
  // UK
  'GB': 'GBP',
  // India
  'IN': 'INR',
};

const RegionalPriceDisplay: React.FC<RegionalPriceDisplayProps> = ({ regionalPrices, countryCode }) => {
  if (!regionalPrices) {
    return <span className="text-slate-400">Pricing information not available.</span>;
  }

  // Determine the best currency to display: local, then fallback to USD
  const localCurrencyKey = countryCode ? currencyMap[countryCode] : undefined;
  const currencyToUse = (localCurrencyKey && regionalPrices[localCurrencyKey]?.price) ? localCurrencyKey : 'USD';
  const priceInfo = regionalPrices[currencyToUse];

  if (!priceInfo || priceInfo.price === null) {
    return <span className="text-slate-400">Pricing not available for your region.</span>;
  }

  const formattedPrice = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyToUse,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceInfo.price);

  const formattedOriginalPrice = priceInfo.originalPrice
    ? new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyToUse,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(priceInfo.originalPrice)
    : null;

  return (
    <div className="text-right">
      <a href={priceInfo.purchaseUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
        <span className={`font-bold text-lg ${formattedOriginalPrice ? 'text-green-400' : 'text-white'}`}>
          {formattedPrice}
        </span>
        {formattedOriginalPrice && (
          <span className="ml-2 text-sm text-slate-400 line-through">{formattedOriginalPrice}</span>
        )}
      </a>
      <p className="text-xs text-slate-500 mt-1">{priceInfo.details}</p>
    </div>
  );
};

export default RegionalPriceDisplay;