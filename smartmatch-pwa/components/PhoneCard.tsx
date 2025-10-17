import React, { useState } from 'react';
import { Phone } from '../types';
import { CheckIcon, XIcon, StarIcon, ThumbsUpIcon, ThumbsDownIcon } from './icons';

interface PhoneCardProps {
  phone: Phone;
  isBestMatch: boolean;
  onSelect: (phone: Phone) => void;
}

const PhoneCard: React.FC<PhoneCardProps> = ({ phone, isBestMatch, onSelect }) => {
  const [feedback, setFeedback] = useState<'liked' | 'disliked' | null>(null);

  const handleFeedback = (e: React.MouseEvent, newFeedback: 'liked' | 'disliked') => {
    e.stopPropagation(); // Prevent the modal from opening
    setFeedback(current => (current === newFeedback ? null : newFeedback));
    // In a real app, you would send this feedback to a server
    console.log(`Feedback for ${phone.name}: ${newFeedback}`);
  };

  const cardClasses = isBestMatch
    ? 'bg-slate-800 border-2 border-cyan-400 rounded-2xl shadow-2xl shadow-cyan-500/20 transform lg:scale-110'
    : 'bg-slate-800/80 border border-slate-700 rounded-2xl shadow-lg hover:border-cyan-500 hover:shadow-cyan-500/10';

  const attributeLabels: { [key: string]: string } = {
      price: "Price",
      performance: "Performance",
      camera: "Camera",
      battery: "Battery",
      design: "Design",
      software: "User Experience",
  };

  return (
    <div className={`w-full text-left p-4 sm:p-6 transition-all duration-300 ease-in-out ${cardClasses}`}>
      {isBestMatch && (
        <div className="text-center mb-4">
          <span className="bg-cyan-400 text-slate-900 text-sm font-bold px-4 py-1 rounded-full">
            BEST MATCH
          </span>
        </div>
      )}
      <button onClick={() => onSelect(phone)} className="w-full text-left">
        <img src={phone.imageUrl || 'https://placehold.co/600x400/999/fff?text=Image+Not+Available'} alt={phone.name} className="w-full h-64 object-cover rounded-lg mb-4" />
        <h3 className={`text-2xl font-bold ${isBestMatch ? 'text-cyan-300' : 'text-white'}`}>{phone.name}</h3>
        <p className="text-slate-400 mb-2">{phone.brand}</p>
        {phone.category && (
          <div className="mt-2 mb-3">
            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-cyan-600 bg-cyan-200">
              {phone.category}
            </span>
          </div>
        )}
      </button>

      <div className="flex items-center gap-2 mb-4">
        <StarIcon className="w-5 h-5 text-amber-400" />
        <span className="font-bold text-lg text-white">{phone.ranking.toFixed(1)}</span>
        <span className="text-slate-400 text-sm">/ 10 Rating</span>
      </div>

      <div className="my-6">
        <h4 className="font-semibold text-lg mb-3 text-slate-200">Key Attributes</h4>
        <div className="space-y-2.5">
          {Object.entries(phone.scores).map(([key, value]) => (
            <div key={key} className="grid grid-cols-3 items-center gap-2">
              <span className="text-sm text-slate-400 col-span-1">{attributeLabels[key] || key}</span>
              <div className="col-span-2 w-full bg-slate-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" style={{ width: `${value}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {phone.matchExplanation && (
        <div className="w-full text-xs sm:text-sm text-slate-300 bg-slate-700/50 p-3 rounded-lg mb-4">
          <p className="font-bold text-cyan-400 mb-1">Why it's a match:</p>
          <p dangerouslySetInnerHTML={{ __html: phone.matchExplanation.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>') }} />
        </div>
      )}

      <div className="mb-4">
        <h4 className="font-semibold text-lg mb-2 text-slate-200">Pros:</h4>
        <ul className="space-y-1">
          {phone.pros.slice(0, 3).map((pro, i) => (
            <li key={i} className="flex items-start">
              <CheckIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-1" />
              <span className="text-slate-300 text-sm">{pro}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-lg mb-2 text-slate-200">Cons:</h4>
        <ul className="space-y-1">
          {phone.cons.slice(0, 3).map((con, i) => (
            <li key={i} className="flex items-start">
              <XIcon className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-1" />
              <span className="text-slate-300 text-sm">{con}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-4">
         <div className="flex gap-2">
            <button
                onClick={(e) => handleFeedback(e, 'liked')}
                className={`p-2 rounded-full transition-colors duration-200 ${feedback === 'liked' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                aria-label="Good recommendation"
            >
                <ThumbsUpIcon className="w-6 h-6" />
            </button>
            <button
                onClick={(e) => handleFeedback(e, 'disliked')}
                className={`p-2 rounded-full transition-colors duration-200 ${feedback === 'disliked' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                aria-label="Bad recommendation"
            >
                <ThumbsDownIcon className="w-6 h-6" />
            </button>
        </div>
        <button
            onClick={() => onSelect(phone)}
            className={`block text-center px-4 py-3 font-bold rounded-lg transition-all duration-300 grow ${
            isBestMatch
                ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-lg'
                : 'bg-slate-700 text-cyan-300'
            }`}
        >
            View Review
        </button>
      </div>

    </div>
  );
};

export default PhoneCard;
