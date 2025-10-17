import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckIcon, XIcon } from '../icons';

interface ProsAndConsListProps {
  pros: string[];
  cons: string[];
  onComplete?: () => void;
}

const ProsAndConsList: React.FC<ProsAndConsListProps> = ({ pros, cons, onComplete }) => {
  useEffect(() => {
    if (onComplete) {
      setTimeout(onComplete, 100);
    }
  }, [onComplete]);

  return (
    <>
      <div className="mb-4">
        <h4 className="font-semibold text-lg mb-2 text-slate-200">Pros:</h4>
        <ul className="space-y-1">
          {pros.slice(0, 3).map((pro, i) => (
            <li key={i} className="flex items-start py-1">
              <CheckIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-slate-300 text-sm leading-relaxed font-medium flex-1">{pro}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6">
        <h4 className="font-semibold text-lg mb-2 text-slate-200">Cons:</h4>
        <ul className="space-y-1">
          {cons.slice(0, 3).map((con, i) => (
            <li key={i} className="flex items-start py-1">
              <XIcon className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-slate-300 text-sm leading-relaxed font-medium flex-1">{con}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default ProsAndConsList;
