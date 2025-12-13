import React, { useState, useEffect } from 'react';
import { Phone, QuizAnswers, ScoreVector, LocalOffer } from '../types';
import PhoneCard from './PhoneCard';
import { getRecommendations, generateUserVector } from '../services/recommendationService';
import LocationFeatures from './LocationFeatures';
import { useLocation } from '../contexts/LocationContext';

interface ResultsProps {
  initialRecommendations: Phone[];
  quizAnswers: QuizAnswers;
  allPhones: Phone[];
  onRestart: () => void;
  onPhoneSelect: (phone: Phone) => void;
}
const attributeLabels: { [key in keyof ScoreVector]: string } = {
  price: "Price",
  performance: "Performance",
  camera: "Camera",
  battery: "Battery",
  design: "Design",
  software: "Software",
};

const Results: React.FC<ResultsProps> = ({ initialRecommendations, quizAnswers, allPhones, onRestart, onPhoneSelect }) => {
  const [userVector, setUserVector] = useState<ScoreVector>(() => generateUserVector(quizAnswers));
  const [recommendations, setRecommendations] = useState<Phone[]>(initialRecommendations);
  const { location } = useLocation(); // Get location from the context
  
  useEffect(() => {
    const answersWithLocation = {
      ...quizAnswers,
      countryCode: location?.countryCode || null,
    };
    const newTop3 = getRecommendations(answersWithLocation, allPhones, userVector);
    setRecommendations(newTop3);
  }, [userVector, quizAnswers, allPhones, location]);

  // Pre-fetch live local offers for the top 3 recommendations
  useEffect(() => {
    if (!location?.countryCode || recommendations.length === 0) return;

    const fetchAllOffers = async () => {
      const offerPromises = recommendations.map(phone =>
        fetch('/api/get-local-offers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneName: phone.name, countryCode: location.countryCode }),
        }).then(res => res.ok ? res.json() : Promise.resolve({ offers: [] }))
          .catch(() => ({ offers: [] }))
      );

      const offerResults = await Promise.all(offerPromises);

      setRecommendations(currentRecommendations =>
        currentRecommendations.map((phone, index) => ({
          ...phone,
          liveOffers: offerResults[index]?.offers || [],
        }))
      );
    };

    // We can run this without showing a loading state on the main screen,
    // as the modal will handle its own loading state if the data isn't ready.
    fetchAllOffers();

  // We only want to run this when the initial recommendations are set, not when they are updated with offers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRecommendations, location]);

  const handlePriorityChange = (attribute: keyof ScoreVector, amount: number) => {
    setUserVector(currentVector => {
      const newValue = Math.max(0, Math.min(100, (currentVector[attribute] || 50) + amount));
      return { ...currentVector, [attribute]: newValue };
    });
  };

  const bestMatch = recommendations[0];
  const otherMatches = recommendations.slice(1);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">Your Perfect Matches!</h2>
        <p className="text-slate-400 mb-8 text-lg">Based on your preferences, here are your top phones. Fine-tune your priorities below!</p>
      </div>

      {/* --- New Feature: Location-based search prompt --- */}
      <LocationFeatures />

      {/* --- New Feature: Priority Adjusters --- */}
      <div className="w-full max-w-4xl bg-slate-800/50 p-4 sm:p-6 rounded-2xl mb-12">
          <h3 className="text-xl font-semibold text-center mb-4 text-cyan-300">Adjust Your Priorities</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.keys(userVector).map(key => (
                  <div key={key} className="bg-slate-700 p-3 rounded-lg text-center">
                      <label className="font-bold text-sm text-slate-300">{attributeLabels[key as keyof ScoreVector]}</label>
                      <div className="flex items-center justify-center gap-2 mt-2">
                          <button onClick={() => handlePriorityChange(key as keyof ScoreVector, -10)} className="w-8 h-8 bg-slate-600 rounded-full text-lg font-bold hover:bg-slate-500">-</button>
                          <div className="w-16 text-center text-xl font-bold">{userVector[key as keyof ScoreVector]}</div>
                          <button onClick={() => handlePriorityChange(key as keyof ScoreVector, 10)} className="w-8 h-8 bg-slate-600 rounded-full text-lg font-bold hover:bg-slate-500">+</button>
                      </div>
                  </div>
              ))}
          </div>
      </div>


      {bestMatch ? (
        <div className="w-full flex flex-col lg:flex-row items-start justify-center gap-8">
          {otherMatches[0] && (
            <div className="w-full lg:w-1/4">
              <PhoneCard phone={otherMatches[0]} isBestMatch={false} onSelect={onPhoneSelect} />
            </div>
          )}

          <div className="w-full lg:w-1/3 order-first lg:order-none">
            <PhoneCard phone={bestMatch} isBestMatch={true} onSelect={onPhoneSelect} />
          </div>

          {otherMatches[1] && (
            <div className="w-full lg:w-1/4">
              <PhoneCard phone={otherMatches[1]} isBestMatch={false} onSelect={onPhoneSelect} />
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-8 bg-slate-800 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">No Matches Found</h2>
          <p className="text-slate-400 mb-6">No reviewed phones matched your criteria. Try adjusting your priorities or check back later as our database grows!</p>
        </div>
      )}


      <button
        onClick={onRestart}
        className="mt-12 px-8 py-3 bg-slate-700 text-cyan-300 font-semibold rounded-lg hover:bg-slate-600 transition-colors duration-300"
      >
        Start Over
      </button>
    </div>
  );
};

export default Results;