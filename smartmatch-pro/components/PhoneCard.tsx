import React from 'react';
import { Phone } from '../types';

interface PhoneCardProps {
  phone: Phone;
  isBestMatch: boolean;
  onSelect: (phone: Phone) => void;
}

const PhoneCard: React.FC<PhoneCardProps> = ({ phone, isBestMatch, onSelect }) => {
  const cardClasses = `
    relative bg-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col items-center text-center 
    cursor-pointer transition-all duration-300 transform hover:scale-105 
    border-2 ${isBestMatch ? 'border-cyan-400 shadow-cyan-400/30 shadow-2xl' : 'border-slate-700 hover:border-slate-600'}
  `;

  return (
    <div className={cardClasses} onClick={() => onSelect(phone)}>
      {isBestMatch && (
        <div className="absolute -top-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-white px-4 py-1 rounded-full text-xs sm:text-sm font-bold shadow-lg">
          Best Match
        </div>
      )}
      <img src={phone.imageUrl} alt={phone.name} className="w-24 sm:w-32 h-auto mb-4" />
      <h3 className={`text-lg sm:text-xl font-bold ${isBestMatch ? 'text-cyan-300' : 'text-white'}`}>{phone.name}</h3>
      <p className="text-xs sm:text-sm text-slate-400 mb-4">{phone.brand}</p>

      {/* Key Attributes */}
      <div className="w-full grid grid-cols-3 gap-2 text-center mb-4 text-xs sm:text-sm">
        <div><span className="font-bold text-slate-200">{(phone.scores.performance / 10).toFixed(1)}</span><span className="text-slate-400"> Perf.</span></div>
        <div><span className="font-bold text-slate-200">{(phone.scores.camera / 10).toFixed(1)}</span><span className="text-slate-400"> Cam.</span></div>
        <div><span className="font-bold text-slate-200">{(phone.scores.battery / 10).toFixed(1)}</span><span className="text-slate-400"> Batt.</span></div>
      </div>

      {/* Pros and Cons */}
      <div className="w-full text-left text-xs space-y-1 mb-4 px-2">
        {phone.pros?.[0] && <p className="text-green-400/80"><span className="font-bold text-green-400">Pro:</span> {phone.pros[0]}</p>}
        {phone.cons?.[0] && <p className="text-red-400/80"><span className="font-bold text-red-400">Con:</span> {phone.cons[0]}</p>}
      </div>

      {phone.matchExplanation && (
        <div className="w-full text-xs sm:text-sm text-slate-300 bg-slate-700/50 p-3 rounded-lg mt-auto">
          <p className="font-bold text-cyan-400 mb-1">Why it's a match:</p>
          <p dangerouslySetInnerHTML={{ __html: phone.matchExplanation.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>') }} />
        </div>
      )}
    </div>
  );
};

export default PhoneCard;