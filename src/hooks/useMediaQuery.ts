
import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string): boolean => {
  // Always check for window existence for SSR compatibility
  const isBrowser = typeof window !== 'undefined';
  
  const [matches, setMatches] = useState(
    isBrowser ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Modern browsers have addEventListener/removeEventListener
    try {
        mediaQueryList.addEventListener('change', listener);
    } catch (e) {
        // Deprecated but necessary for some older browsers
        mediaQueryList.addListener(listener);
    }

    // Initial check
    setMatches(mediaQueryList.matches);

    return () => {
      try {
        mediaQueryList.removeEventListener('change', listener);
      } catch (e) {
        mediaQueryList.removeListener(listener);
      }
    };
  }, [query, isBrowser]);

  return matches;
};

      