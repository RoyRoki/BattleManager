import { useState, useEffect } from 'react';

interface CountdownResult {
  timeRemaining: number; // in milliseconds
  minutes: number;
  seconds: number;
  isExpired: boolean;
  showLabel: string | null; // '10 min', '5 min', '2 min', '1 min', or null
}

/**
 * Hook to calculate countdown to a target date
 * Updates every second
 */
export const useCountdown = (targetDate: Date | null | undefined): CountdownResult => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!targetDate) {
      setTimeRemaining(0);
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const remaining = target - now;
      setTimeRemaining(Math.max(0, remaining));
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const isExpired = timeRemaining <= 0;
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  // Determine which label to show
  let showLabel: string | null = null;
  if (!isExpired && timeRemaining > 0) {
    const totalMinutes = Math.floor(timeRemaining / 60000);
    if (totalMinutes <= 1 && totalMinutes > 0) {
      showLabel = '1 min';
    } else if (totalMinutes <= 2 && totalMinutes > 1) {
      showLabel = '2 min';
    } else if (totalMinutes <= 5 && totalMinutes > 2) {
      showLabel = '5 min';
    } else if (totalMinutes <= 10 && totalMinutes > 5) {
      showLabel = '10 min';
    }
  }

  return {
    timeRemaining,
    minutes,
    seconds,
    isExpired,
    showLabel,
  };
};










