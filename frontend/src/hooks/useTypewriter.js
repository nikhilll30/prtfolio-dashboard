import { useState, useEffect } from 'react';

// Types `text` out one character at a time. Renders instantly for
// users with prefers-reduced-motion enabled.
export default function useTypewriter(text, speed = 40) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [charCount, setCharCount] = useState(prefersReducedMotion ? text.length : 0);

  useEffect(() => {
    if (prefersReducedMotion || charCount >= text.length) return;
    const timer = setTimeout(() => setCharCount((c) => c + 1), speed);
    return () => clearTimeout(timer);
  }, [charCount, text, speed, prefersReducedMotion]);

  return {
    text: text.slice(0, charCount),
    done: charCount >= text.length,
  };
}
