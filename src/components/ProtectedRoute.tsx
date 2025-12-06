import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../utils/constants';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean; // If false, shows login if not authenticated (default behavior)
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = false,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-primary text-xl font-heading">Loading...</div>
      </div>
    );
  }

  // If route requires auth but user is not logged in, redirect to login
  if (requireAuth && !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // If user is logged in and trying to access login page, redirect to home
  if (!requireAuth && user) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
};

