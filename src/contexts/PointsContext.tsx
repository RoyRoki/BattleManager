import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { useAuth } from './AuthContext';
import { User } from '../types';

interface PointsContextType {
  points: number;
  isLoading: boolean;
  refreshPoints: () => Promise<void>;
}

const PointsContext = createContext<PointsContextType | undefined>(undefined);

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) {
    throw new Error('usePoints must be used within PointsProvider');
  }
  return context;
};

interface PointsProviderProps {
  children: ReactNode;
}

export const PointsProvider: React.FC<PointsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setPoints(0);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(firestore, 'users', user.email.toLowerCase().trim()),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data() as User;
          setPoints(userData.points || 0);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to points:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.email]);

  const refreshPoints = async () => {
    if (user?.email) {
      // Points will be updated via real-time listener
      // This is just for manual refresh if needed
      setIsLoading(true);
    }
  };

  const value: PointsContextType = {
    points,
    isLoading,
    refreshPoints,
  };

  return <PointsContext.Provider value={value}>{children}</PointsContext.Provider>;
};


