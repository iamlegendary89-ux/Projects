/**
 * Typewriter Component - Character-by-Character Text Streaming
 *
 * A React component that creates a typewriter effect by revealing text
 * character-by-character in real-time with a blinking cursor.
 *
 * @example
 * // Basic usage with default 200ms typing speed
 * <Typewriter text="Hello world!" />
 *
 * // iPhone recommendation text with SmartMatch PWA styling
 * <Typewriter
 *   text="Find your dream iPhone 16 Pro Max - the ultimate flagship experience awaits..."
 *   className="justify-center"
 *   textColor="text-slate-400"
 *   cursorColor="bg-cyan-400"
 *   typingSpeed={200}
 * />
 */
import React, { useState, useEffect, useRef } from 'react';

interface TypewriterProps {
  text: string;
  className?: string;
  cursorColor?: string;
  textColor?: string;
  cursorBlinkDuration?: number;
  typingSpeed?: number;
}

const Typewriter: React.FC<TypewriterProps> = ({
  text,
  className = "",
  cursorColor = "bg-cyan-400",
  textColor = "text-slate-100",
  cursorBlinkDuration = 500,
  typingSpeed = 200
}) => {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    // Reset state when text changes
    setDisplayText('');
    setShowCursor(true);
    currentIndexRef.current = 0;

    // Clear any existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!text) return;

    // Start cursor blinking immediately
    intervalRef.current = setInterval(() => {
      setShowCursor(prev => !prev);
    }, cursorBlinkDuration);

    // Start typing animation with a slight delay
    timeoutRef.current = setTimeout(() => {
      const typeInterval = setInterval(() => {
        if (currentIndexRef.current < text.length) {
          currentIndexRef.current += 1;
          setDisplayText(text.slice(0, currentIndexRef.current));
        } else {
          // Typing complete, stop the typing interval
          clearInterval(typeInterval);

          // Keep cursor visible at the end without blinking
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setShowCursor(true);
        }
      }, typingSpeed);

      // Store the typing interval for cleanup
      timeoutRef.current = typeInterval;
    }, 300); // Initial delay before typing starts

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, typingSpeed, cursorBlinkDuration]);

  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className={textColor}>
        {displayText}
      </span>
      {showCursor && text && displayText.length < text.length && (
        <span
          className={`inline-block w-0.5 h-5 ml-1 rounded-sm ${cursorColor} transition-opacity duration-75`}
          style={{ opacity: showCursor ? 1 : 0 }}
        />
      )}
    </span>
  );
};

export default Typewriter;
