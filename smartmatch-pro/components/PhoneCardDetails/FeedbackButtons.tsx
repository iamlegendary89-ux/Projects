import React, { useState } from 'react';
import { ThumbsUpIcon, ThumbsDownIcon } from '../icons';

interface FeedbackButtonsProps {
  phoneName: string;
}

const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({ phoneName }) => {
  const [feedback, setFeedback] = useState<'liked' | 'disliked' | null>(null);

  const handleFeedback = (e: React.MouseEvent, newFeedback: 'liked' | 'disliked') => {
    e.stopPropagation(); // Prevent the modal from opening
    setFeedback(current => (current === newFeedback ? null : newFeedback));
    // In a real app, you would send this feedback to a server
    console.log(`Feedback for ${phoneName}: ${newFeedback}`);
  };

  return (
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
  );
};

export default FeedbackButtons;
