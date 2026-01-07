'use client';

import { useEffect, useState } from 'react';

const FIRST_VISIT_KEY = 'lmsy-first-visit';

/**
 * Hook to detect if this is the user's first visit to lmsy.space
 * Uses localStorage to remember if the user has visited before
 */
export function useFirstVisit(): boolean {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem(FIRST_VISIT_KEY);

    if (!hasVisited) {
      // First visit!
      setIsFirstVisit(true);

      // Mark as visited
      localStorage.setItem(FIRST_VISIT_KEY, 'true');
    } else {
      // Returning visitor
      setIsFirstVisit(false);
    }
  }, []);

  return isFirstVisit;
}
