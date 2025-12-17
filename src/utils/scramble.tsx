import { createContext, useContext, useMemo } from 'react';

const CHARS = "0123456789ABCDEF§±!@#$%^&*()_+=<>?[]{}|;:";

/**
 * Replaces alphanumeric characters with random symbols while preserving whitespace.
 */
export const scrambleText = (text: string): string => {
  return text.split('').map(char => {
    // Keep whitespace, newlines, and some basic punctuation intact for layout preservation
    if (/\s/.test(char)) return char;
    return CHARS[Math.floor(Math.random() * CHARS.length)];
  }).join('');
};

// Context to control whether scrambling is active for a subtree
export const ScrambleContext = createContext<boolean>(false);

/**
 * Hook to automatically scramble text if the context is true.
 * Memoized to prevent jittering on unrelated re-renders.
 */
export const useScramble = (text: string): string => {
  const shouldScramble = useContext(ScrambleContext);
  
  return useMemo(() => {
    if (!shouldScramble) return text;
    return scrambleText(text);
  }, [text, shouldScramble]);
};

/**
 * Helper component for static text blocks
 */
export const Scrambler: React.FC<{ children: string }> = ({ children }) => {
  const text = useScramble(children);
  return <>{text}</>;
};

/**
 * Component for scrambling text content (works with ScrambleContext)
 */
export const ScrambledText: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const shouldScramble = useContext(ScrambleContext);
  
  if (!shouldScramble || typeof children !== 'string') {
    return <>{children}</>;
  }
  
  const scrambled = useScramble(children);
  return <>{scrambled}</>;
};

