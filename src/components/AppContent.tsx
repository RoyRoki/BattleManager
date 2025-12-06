import { useLocation } from 'react-router-dom';
import { BottomNav } from './bottom-nav';
import { AppHeader } from '../shared/components/layout/AppHeader';
import { ROUTES } from '../utils/constants';

export const AppContent: React.FC = () => {
  const location = useLocation();
  const hideNav = location.pathname === ROUTES.LOGIN;
  
  // Hide header on inner screens (Support, Profile, Notifications, Chat, Tournament Detail)
  const hideHeader =
    location.pathname === ROUTES.SUPPORT ||
    location.pathname === ROUTES.PROFILE ||
    location.pathname === ROUTES.NOTIFICATIONS ||
    location.pathname === ROUTES.CHAT ||
    location.pathname.startsWith('/tournament/');

  return (
    <>
      {!hideNav && !hideHeader && <AppHeader />}
      {!hideNav && <BottomNav />}
    </>
  );
};

