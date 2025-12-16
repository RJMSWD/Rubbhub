import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { AuthProvider, EntriesProvider, ToastProvider, ConfirmProvider, ThemeProvider } from './context';
import { ToastContainer, ConfirmDialog } from './components/common';

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const DetailPage = lazy(() => import('./pages/DetailPage').then(m => ({ default: m.DetailPage })));
const CreatePage = lazy(() => import('./pages/CreatePage').then(m => ({ default: m.CreatePage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const AuthView = lazy(() => import('./components/auth/AuthView').then(m => ({ default: m.AuthView })));
const ProfileView = lazy(() => import('./components/auth/ProfileView').then(m => ({ default: m.ProfileView })));
const UserPage = lazy(() => import('./pages/UserPage').then(m => ({ default: m.UserPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));

const PageLoader = () => {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setShow(true), 180);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <div className="w-72 space-y-4">
        <div className="h-10 bg-gray-200 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse" />
        <div className="h-6 bg-gray-200 animate-pulse" />
        <div className="h-6 bg-gray-200 w-2/3 animate-pulse" />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <EntriesProvider>
                <ToastContainer />
                <ConfirmDialog />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/entry/:id" element={<DetailPage />} />
                    <Route path="/create" element={<CreatePage />} />
                    <Route path="/edit/:id" element={<CreatePage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/auth" element={<AuthView />} />
                    <Route path="/profile" element={<ProfileView />} />
                    <Route path="/user/:username" element={<UserPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </EntriesProvider>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
