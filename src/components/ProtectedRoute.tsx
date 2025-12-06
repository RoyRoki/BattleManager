import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
  const { user, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-primary text-xl font-heading">Loading...</div>
      </div>
    );
  }

  // If admin tries to access regular user routes, redirect to admin dashboard
  if (isAdmin && !location.pathname.startsWith('/admin') && location.pathname !== ROUTES.LOGIN) {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  // If route requires auth but user is not logged in, redirect to login
  if (requireAuth && !user && !isAdmin) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // If user is logged in and trying to access login page, redirect appropriately
  // Only redirect if we're on the login page, not on other public pages
  if (location.pathname === ROUTES.LOGIN && (user || isAdmin)) {
    if (isAdmin) {
      return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
    }
    return <Navigate to={ROUTES.HOME} replace />;
  }

  // For all other routes, just render the children
  return <>{children}</>;
};

