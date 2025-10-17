import React, { useState, useMemo } from 'react';
import { Phone } from '../types';

interface AllPhonesListProps {
  phones: Phone[];
  onSelectPhone: (phone: Phone) => void;
  onBack: () => void;
}

type SortKey = keyof Phone['scores'] | 'ranking';

const AllPhonesList: React.FC<AllPhonesListProps> = ({ phones, onSelectPhone, onBack }) => {
  const [sortBy, setSortBy] = useState<SortKey>('ranking');

  // Calculate rankings for phones that don't have them
  const phonesWithRankings = useMemo(() => {
    return phones.map(phone => {
      if (typeof phone.ranking !== 'number') {
        // Calculate ranking: weighted average of scores
        const scores = phone.scores;
        const ranking = (
          (scores.performance * 0.25) +
          (scores.camera * 0.25) +
          (scores.battery * 0.20) +
          (scores.display * 0.15) +
          (scores.design * 0.10) +
          (scores.software * 0.05)
        );
        return { ...phone, ranking: Math.round(ranking * 10) / 10 }; // Round to 1 decimal
      }
      return phone;
    });
  }, [phones]);

  const sortedPhones = useMemo(() => {
    const sorted = [...phonesWithRankings].sort((a, b) => {
      if (sortBy === 'ranking') {
        const aRank = typeof a.ranking === 'number' ? a.ranking : 0;
        const bRank = typeof b.ranking === 'number' ? b.ranking : 0;
        return bRank - aRank;
      } else {
        const aScore = a.scores[sortBy] || 0;
        const bScore = b.scores[sortBy] || 0;
        return bScore - aScore;
      }
    });
    return sorted;
  }, [phonesWithRankings, sortBy]);

  console.log(`📱 AllPhonesList: ${phonesWithRankings.length} phones, sorted by ${sortBy}`);

  if (!phonesWithRankings || phonesWithRankings.length === 0) {
    console.log('❌ No phones to display');
    return (
      <div className="text-center p-8">
        <p className="text-slate-400 text-lg">No phones available.</p>
        <button
          onClick={onBack}
          className="mt-6 px-8 py-3 bg-slate-700 text-cyan-300 font-semibold rounded-lg hover:bg-slate-600 transition-colors duration-300"
        >
          Back to Quiz
        </button>
      </div>
    );
  }

  const sortOptions: { label: string; key: SortKey }[] = [
    { label: 'Overall', key: 'ranking' },
    { label: 'Performance', key: 'performance' },
    { label: 'Camera', key: 'camera' },
    { label: 'Battery', key: 'battery' },
    { label: 'Design', key: 'design' },
    { label: 'Software', key: 'software' },
  ];

  const getSortValue = (phone: Phone) => {
    if (sortBy === 'ranking') {
      return typeof phone.ranking === 'number' ? phone.ranking.toFixed(1) : 'N/A';
    }
    return phone.scores[sortBy] || 'N/A';
  };

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
            onClick={() => setSortBy(option.key)}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
              sortBy === option.key ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-4 -mr-4">
        {sortedPhones.map(phone => {
          console.log(`📱 Rendering phone: ${phone.name}, ${sortBy}: ${getSortValue(phone)}`);
          return (
            <div key={phone.id} className="w-full">
              <div
                className="w-full flex items-center justify-between bg-slate-700/50 p-4 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                onClick={() => {
                  console.log(`🎯 Phone clicked: ${phone.name}`);
                  onSelectPhone(phone);
                }}
                role="button"
              >
                <div className="flex items-center">
                  <img
                    src={phone.imageUrl || 'https://placehold.co/100x100/999/fff?text=N/A'}
                    alt={phone.name}
                    className="w-16 h-16 object-cover rounded-md mr-4"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-white">{phone.name}</h3>
                    <p className="text-sm text-slate-400">{phone.brand || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xl text-cyan-300">
                    {getSortValue(phone)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => {
            console.log('⬅️ Back to quiz clicked');
            onBack();
          }}
          className="px-8 py-3 bg-slate-700 text-cyan-300 font-semibold rounded-lg hover:bg-slate-600 transition-colors duration-300"
        >
          Back to Quiz
        </button>
      </div>
    </div>
  );
};

export default AllPhonesList;
