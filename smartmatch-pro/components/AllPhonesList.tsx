import React, { useState, useMemo } from 'react';
import { StarIcon } from './icons';
import { Phone, ScoreVector } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface AllPhonesListProps {
  phones: Phone[];
  onBack: () => void;
  onPhoneSelect: (phone: Phone) => void;
}

type SortKey = 'ranking' | keyof ScoreVector;

const sortOptions: { key: SortKey, label: string }[] = [
    { key: 'ranking', label: 'Overall' },
    { key: 'performance', label: 'Performance' },
    { key: 'camera', label: 'Camera' },
    { key: 'battery', label: 'Battery' },
    { key: 'design', label: 'Display' }, // Note: 'design' score is used for Display
];

const AllPhonesList: React.FC<AllPhonesListProps> = ({ phones, onBack, onPhoneSelect }) => {
  const [sortKey, setSortKey] = useState<SortKey>('ranking');

  const sortedPhones = useMemo(() => {
    const reviewedPhones = phones.filter(p => !p.summary.toLowerCase().includes('placeholder'));
    
    return [...reviewedPhones].sort((a, b) => {
      if (sortKey === 'ranking') {
        return b.ranking - a.ranking;
      }
      return b.scores[sortKey] - a.scores[sortKey];
    });
  }, [phones, sortKey]);

  return (
    <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl shadow-cyan-500/10 w-full">
      <h2 className="text-3xl sm:text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">
        Full Phone Rankings
      </h2>
      <p className="text-slate-400 mb-6 text-lg">Sort the database by what matters most to you.</p>
      
      <div className="flex flex-wrap gap-2 mb-8 w-full">
        {sortOptions.map(option => (
          <button
            key={option.key}
            onClick={() => setSortKey(option.key)}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
              sortKey === option.key
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      
      <motion.div layout className="space-y-2 max-h-[60vh] overflow-y-auto pr-4 -mr-4">
        <AnimatePresence>
          {sortedPhones.map((phone, index) => (
            <motion.div
              key={phone.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button 
                onClick={() => onPhoneSelect(phone)}
                className="w-full flex items-center justify-between bg-slate-700/50 p-4 rounded-lg hover:bg-slate-700 transition-colors text-left"
              >
                <div className="flex items-center">
                  <span className="text-xl font-bold text-slate-400 w-12 text-center flex-shrink-0">{index + 1}.</span>
                  <img src={phone.imageUrl} alt={phone.name} className="w-10 h-16 object-cover rounded-md mx-4" />
                  <div>
                    <p className="font-bold text-white text-md sm:text-lg">{phone.name}</p>
                    <p className="text-slate-400 text-sm">{phone.brand}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StarIcon className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-xl text-white">
                    {sortKey === 'ranking' ? phone.ranking.toFixed(1) : (phone.scores[sortKey] / 10).toFixed(1)}
                  </span>
                </div>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <div className="mt-8 text-center">
        <button
          onClick={onBack}
          className="px-8 py-3 bg-slate-700 text-cyan-300 font-semibold rounded-lg hover:bg-slate-600 transition-colors duration-300"
        >
          Back to Quiz
        </button>
      </div>
    </div>
  );
};

export default AllPhonesList;
