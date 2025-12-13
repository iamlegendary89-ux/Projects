import React, { useState } from 'react';
import { QuizAnswers, QuizQuestion } from '../types';

interface QuizProps {
  onSubmit: (answers: QuizAnswers) => void;
  onViewAll: () => void;
}

const quizQuestions: QuizQuestion[] = [
  {
    id: 'budget',
    text: "What's your budget?",
    options: ["Budget (<$500)", "Mid-Range ($500-$900)", "Premium (>$900)"],
  },
  {
    id: 'cameraImportance',
    text: "How important is camera quality?",
    options: ["Top Priority", "Important", "Not a Factor"],
  },
  {
    id: 'batteryImportance',
    text: "How crucial is all-day battery life?",
    options: ["Essential", "Important", "Not a Factor"],
  },
  {
    id: 'primaryUsage',
    text: "What will you use your phone for most?",
    options: ["Gaming & Pro Apps", "Social & Streaming", "Basics (Calls, Texts)"],
  },
  {
    id: 'stylePreference',
    text: "What's your preferred style?",
    options: ["Simple & Seamless (iOS)", "Customizable (Android)", "No Preference"],
  },
];

const Quiz: React.FC<QuizProps> = ({ onSubmit, onViewAll }) => {
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleAnswer = (questionId: keyof QuizAnswers, option: string) => {
    const newAnswers = { ...answers, [questionId]: option };

    // Special handling for the style question to auto-select OS
    if (questionId === 'stylePreference') {
        if (option.includes('iOS')) {
            newAnswers.os = 'iOS';
        } else if (option.includes('Android')) {
            newAnswers.os = 'Android';
        } else {
            newAnswers.os = 'No Preference';
        }
    }

    setAnswers(newAnswers);

    const isComplete = Object.keys(newAnswers).length === (quizQuestions.length + 1); // +1 for the auto-selected OS

    if (isComplete) {
      onSubmit(newAnswers as QuizAnswers);
    } else if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

  return (
    <>
      <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl shadow-cyan-500/10">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl sm:text-2xl font-semibold text-cyan-300">Question {currentQuestionIndex + 1}/{quizQuestions.length}</h2>
            <span className="text-slate-400">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2.5">
            <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <div key={currentQuestion.id}>
            <p className="text-xl sm:text-2xl font-medium mb-6 text-slate-100">{currentQuestion.text}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentQuestion.options.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => handleAnswer(currentQuestion.id, option)}
                  className={`p-4 rounded-lg text-left text-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-400 ${
                    answers[currentQuestion.id] === option
                      ? 'bg-cyan-500 text-white font-semibold shadow-lg'
                      : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

        </form>
      </div>
      <div className="text-center mt-6">
        <span className="text-slate-400">Or, </span>
        <button onClick={onViewAll} className="text-cyan-400 font-semibold hover:underline">
          view our full phone rankings.
        </button>
      </div>
    </>
  );
};

export default Quiz;