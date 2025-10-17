import React, { useState, useCallback, useEffect } from 'react';
import { QuizAnswers, Phone } from './types';
import { getRecommendations } from './services/recommendationService';
import Quiz from './components/Quiz';
import Results from './components/Results';
import AllPhonesList from './components/AllPhonesList';
import PhoneReviewModal from './components/PhoneReviewModal';
import Typewriter from './components/Typewriter';
import { LogoIcon } from './components/icons';
import { useLocation } from './contexts/LocationContext';


const App: React.FC = () => {
  const [view, setView] = useState<'quiz' | 'results' | 'allPhones'>('quiz');
  const [recommendations, setRecommendations] = useState<Phone[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedPhone, setSelectedPhone] = useState<Phone | null>(null);
  const [phonesDB, setPhonesDB] = useState<Phone[]>([]);
  const [isAppLoading, setIsAppLoading] = useState<boolean>(true);
  const { location } = useLocation(); // Get location from the context
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchPhoneData = async () => {
      try {
        const response = await fetch('/data/phones.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Phone[] = await response.json();
        setPhonesDB(data);
      } catch (e) {
        console.error("Failed to fetch phone data:", e);
        setError("Could not load phone database. Please try refreshing the page.");
      } finally {
        setIsAppLoading(false);
      }
    };

    fetchPhoneData();
  }, []);


  const handleQuizSubmit = async (answers: QuizAnswers) => {
    setIsLoading(true);
    setQuizAnswers(answers);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    try {
      const top3 = getRecommendations(answers, phonesDB);
      setRecommendations(top3);
      setView('results');
    } catch (e) {
      console.error("Failed to get recommendations:", e);
      setError("Could not generate recommendations. Please try again.");
      setView('quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setView('quiz');
    setRecommendations([]);
    setQuizAnswers(null);
  };
  
  const handleViewAll = () => {
    setView('allPhones');
  };

  const handlePhoneSelect = (phone: Phone) => {
    setSelectedPhone(phone);
  };

  const handleCloseModal = () => {
    setSelectedPhone(null);
  };

  const renderContent = () => {
    if (isAppLoading || isLoading) {
      const message = isAppLoading ? "Loading phone database..." : "Finding your perfect match...";
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
          <p className="mt-4 text-lg text-slate-300">{message}</p>
        </div>
      );
    }

    if (error) {
        return (
             <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-lg text-red-400">{error}</p>
             </div>
        );
    }

    switch (view) {
      case 'quiz':
        return <Quiz onSubmit={handleQuizSubmit} onViewAll={handleViewAll} />;
      case 'results':
        return <Results initialRecommendations={recommendations} quizAnswers={quizAnswers!} allPhones={phonesDB} onRestart={handleRestart} onPhoneSelect={handlePhoneSelect} />;
      case 'allPhones':
        if (isAppLoading) {
          return (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
              <p className="mt-4 text-lg text-slate-300">Loading phone database...</p>
            </div>
          );
        }
        return <AllPhonesList phones={phonesDB} onBack={handleRestart} onSelectPhone={handlePhoneSelect} />;
      default:
        return <Quiz onSubmit={handleQuizSubmit} onViewAll={handleViewAll} />;
    }
  };


  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <header className="w-full max-w-4xl mb-8 text-center">
        <div className="flex items-center justify-center gap-4 mb-2">
            <LogoIcon />
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            SmartMatch
            </h1>
        </div>
        <p className="text-slate-400 text-lg">Find your perfect phone in seconds.</p>
      </header>

      <main className="w-full max-w-4xl flex-grow">
        {renderContent()}
      </main>
      
      {selectedPhone && (
        <PhoneReviewModal
          phone={selectedPhone}
          onClose={handleCloseModal}
          countryCode={location?.country} // Pass country directly from context
        />
      )}

      <footer className="w-full max-w-4xl mt-8 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} SmartMatch. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
