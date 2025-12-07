import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { PointsProvider } from './contexts/PointsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AdminAuth } from './components/AdminAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppContent } from './components/AppContent';
import ErrorBoundary from './components/ErrorBoundary';
import { ROUTES } from './utils/constants';

// Lazy load pages
const HomePage = lazy(() =>
  import('./pages/home-page').then((module) => ({ default: module.HomePage }))
);
const MoneyPage = lazy(() =>
  import('./pages/money-page').then((module) => ({ default: module.MoneyPage }))
);
const ChatPage = lazy(() =>
  import('./pages/chat-page').then((module) => ({ default: module.ChatPage }))
);
const SupportPage = lazy(() =>
  import('./pages/support-page').then((module) => ({ default: module.SupportPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/profile-page').then((module) => ({ default: module.ProfilePage }))
);
const TournamentDetailPage = lazy(() =>
  import('./pages/tournament-detail-page').then((module) => ({
    default: module.TournamentDetailPage,
  }))
);
const TournamentHistoryPage = lazy(() =>
  import('./pages/tournament-history-page').then((module) => ({
    default: module.TournamentHistoryPage,
  }))
);
const AdminDashboard = lazy(() =>
  import('./pages/admin/admin-dashboard').then((module) => ({
    default: module.AdminDashboard,
  }))
);
const TournamentManagement = lazy(() =>
  import('./pages/admin/tournament-management').then((module) => ({
    default: module.TournamentManagement,
  }))
);
const PaymentManagement = lazy(() =>
  import('./pages/admin/payment-management').then((module) => ({
    default: module.PaymentManagement,
  }))
);
const UserManagement = lazy(() =>
  import('./pages/admin/user-management').then((module) => ({
    default: module.UserManagement,
  }))
);
const AdminSettings = lazy(() =>
  import('./pages/admin/admin-settings').then((module) => ({
    default: module.AdminSettings,
  }))
);
const AdminNotifications = lazy(() =>
  import('./pages/admin/admin-notifications').then((module) => ({
    default: module.AdminNotifications,
  }))
);
const AdminSupportChat = lazy(() =>
  import('./pages/admin/admin-support-chat').then((module) => ({
    default: module.AdminSupportChat,
  }))
);
const LoginPage = lazy(() =>
  import('./features/auth').then((module) => ({
    default: module.LoginPage,
  }))
);
const AdminLoginPage = lazy(() =>
  import('./pages/admin/admin-login-page').then((module) => ({
    default: module.AdminLoginPage,
  }))
);
const NotificationsPage = lazy(() =>
  import('./pages/notifications-page').then((module) => ({
    default: module.NotificationsPage,
  }))
);

const LoadingFallback = () => (
  <div className="min-h-screen bg-bg flex items-center justify-center">
    <div className="text-primary text-xl font-heading">Loading...</div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <PointsProvider>
            <BrowserRouter>
              <div className="min-h-screen bg-bg">
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route
                      path={ROUTES.LOGIN}
                      element={
                        <ProtectedRoute requireAuth={false}>
                          <LoginPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path={ROUTES.ADMIN_LOGIN}
                      element={
                        <ProtectedRoute requireAuth={false}>
                          <AdminLoginPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path={ROUTES.HOME}
                      element={
                        <ProtectedRoute requireAuth>
                          <HomePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path={ROUTES.MONEY}
                      element={
                        <ProtectedRoute requireAuth>
                          <MoneyPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path={ROUTES.CHAT}
                      element={
                        <ProtectedRoute requireAuth>
                          <ChatPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path={ROUTES.SUPPORT} element={<SupportPage />} />
                    <Route
                      path={ROUTES.PROFILE}
                      element={
                        <ProtectedRoute requireAuth>
                          <ProfilePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path={ROUTES.NOTIFICATIONS}
                      element={
                        <ProtectedRoute requireAuth>
                          <NotificationsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path={ROUTES.TOURNAMENT_HISTORY}
                      element={
                        <ProtectedRoute requireAuth={false}>
                          <TournamentHistoryPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/tournament/:id" element={<TournamentDetailPage />} />
                    <Route
                      path={ROUTES.ADMIN_DASHBOARD}
                      element={
                        <AdminAuth>
                          <AdminDashboard />
                        </AdminAuth>
                      }
                    />
                    <Route
                      path={ROUTES.ADMIN_TOURNAMENTS}
                      element={
                        <AdminAuth>
                          <TournamentManagement />
                        </AdminAuth>
                      }
                    />
                    <Route
                      path={ROUTES.ADMIN_PAYMENTS}
                      element={
                        <AdminAuth>
                          <PaymentManagement />
                        </AdminAuth>
                      }
                    />
                    <Route
                      path={ROUTES.ADMIN_USERS}
                      element={
                        <AdminAuth>
                          <UserManagement />
                        </AdminAuth>
                      }
                    />
                    <Route
                      path={ROUTES.ADMIN_SETTINGS}
                      element={
                        <AdminAuth>
                          <AdminSettings />
                        </AdminAuth>
                      }
                    />
                    <Route
                      path={ROUTES.ADMIN_NOTIFICATIONS}
                      element={
                        <AdminAuth>
                          <AdminNotifications />
                        </AdminAuth>
                      }
                    />
                    <Route
                      path={ROUTES.ADMIN_SUPPORT_CHAT}
                      element={
                        <AdminAuth>
                          <AdminSupportChat />
                        </AdminAuth>
                      }
                    />
                    <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
                  </Routes>
                </Suspense>
                <AppContent />
                <Toaster
                  position="top-center"
                  toastOptions={{
                    duration: 3000,
                    style: {
                      background: '#1A1A1A',
                      color: '#FFBA00',
                      border: '1px solid #FFBA00',
                    },
                  }}
                />
              </div>
            </BrowserRouter>
          </PointsProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;


