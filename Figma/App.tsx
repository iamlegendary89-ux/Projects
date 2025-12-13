import { useState, useEffect } from 'react';
import { Landing } from './components/Landing';
import { GuidedFlow } from './components/GuidedFlow';
import { Thinking } from './components/Thinking';
import { DestinyReveal } from './components/DestinyReveal';
import { Explore } from './components/Explore';
import { calculateArchetype, Archetype } from './utils/archetypes';
import { getTopRecommendation, Phone } from './utils/phones';

type Screen = 'landing' | 'flow' | 'thinking' | 'reveal' | 'explore';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [recommendedPhone, setRecommendedPhone] = useState<Phone | null>(null);

  // Calculate archetype dynamically as user answers questions
  useEffect(() => {
    if (Object.keys(userAnswers).length > 0) {
      const currentArchetype = calculateArchetype(userAnswers);
      setArchetype(currentArchetype);
    }
  }, [userAnswers]);

  const handleBegin = () => {
    setCurrentScreen('flow');
  };

  const handleFlowComplete = (answers: Record<string, any>) => {
    setUserAnswers(answers);
    const finalArchetype = calculateArchetype(answers);
    setArchetype(finalArchetype);
    const phone = getTopRecommendation(answers);
    setRecommendedPhone(phone);
    setCurrentScreen('thinking');
  };

  const handleThinkingComplete = () => {
    setCurrentScreen('reveal');
  };

  const handleExplore = () => {
    setCurrentScreen('explore');
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-[#F5F5F5]">
      {currentScreen === 'landing' && (
        <Landing onBegin={handleBegin} />
      )}

      {currentScreen === 'flow' && (
        <GuidedFlow 
          onComplete={handleFlowComplete}
          currentArchetype={archetype ? {
            color: archetype.color,
            particleColor: archetype.particleColor
          } : undefined}
        />
      )}

      {currentScreen === 'thinking' && archetype && (
        <Thinking 
          archetype={archetype}
          onComplete={handleThinkingComplete}
        />
      )}

      {currentScreen === 'reveal' && archetype && recommendedPhone && (
        <DestinyReveal
          archetype={archetype}
          recommendedPhone={recommendedPhone}
          userValues={userAnswers}
          onExplore={handleExplore}
        />
      )}

      {currentScreen === 'explore' && archetype && recommendedPhone && (
        <Explore
          archetype={archetype}
          userValues={userAnswers}
          recommendedPhoneId={recommendedPhone.id}
        />
      )}
    </div>
  );
}
