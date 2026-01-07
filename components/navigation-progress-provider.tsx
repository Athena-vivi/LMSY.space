'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { NProgressBar } from '@/components/nprogress-bar';
import { useRouter } from 'next/navigation';

interface NavigationProgressContextType {
  startProgress: () => void;
}

const NavigationProgressContext = createContext<NavigationProgressContextType>({
  startProgress: () => {},
});

export function useNavigationProgress() {
  return useContext(NavigationProgressContext);
}

interface NavigationProgressProviderProps {
  children: ReactNode;
}

/**
 * Provider for NProgress-style progress bar
 * Shows thin progress bar at top of screen during page navigation
 */
export function NavigationProgressProvider({ children }: NavigationProgressProviderProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const router = useRouter();

  const startProgress = () => {
    setIsAnimating(true);
  };

  useEffect(() => {
    // Listen for route changes
    const handleRouteChangeStart = () => {
      setIsAnimating(true);
    };

    const handleRouteChangeComplete = () => {
      setIsAnimating(false);
    };

    // Note: Next.js App Router doesn't have the same route events as Pages Router
    // This is a simplified version - in practice, you'd use Next.js navigation events
    // or wrap this around specific actions

    return () => {
      // Cleanup
    };
  }, [router]);

  return (
    <NavigationProgressContext.Provider value={{ startProgress }}>
      <NProgressBar isAnimating={isAnimating} />
      {children}
    </NavigationProgressContext.Provider>
  );
}
