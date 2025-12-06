import { useLocation } from 'react-router-dom';
import { BottomNav } from './bottom-nav';
import { AdminBottomNav } from './admin-bottom-nav';
import { AppHeader } from '../shared/components/layout/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../utils/constants';

export const AppContent: React.FC = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const hideNav = location.pathname === ROUTES.LOGIN;
  
  // Check if we're on an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Hide header on inner screens (Support, Profile, Notifications, Chat, Tournament Detail)
  // Also hide on admin routes (admin pages have their own headers)
  const hideHeader =
    location.pathname === ROUTES.SUPPORT ||
    location.pathname === ROUTES.PROFILE ||
    location.pathname === ROUTES.NOTIFICATIONS ||
    location.pathname === ROUTES.CHAT ||
    location.pathname.startsWith('/tournament/') ||
    isAdminRoute;

  return (
    <>
      {!hideNav && !hideHeader && <AppHeader />}
      {!hideNav && (
        <>
          {isAdmin && isAdminRoute ? (
            <AdminBottomNav />
          ) : !isAdmin ? (
            <BottomNav />
          ) : null}
        </>
      )}
    </>
  );
};

