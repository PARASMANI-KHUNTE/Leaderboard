import React, { createContext, useState, useEffect, useContext, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config';

// Lazy load pages for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const LeaderboardView = lazy(() => import('./pages/LeaderboardView'));
const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Releases = lazy(() => import('./pages/Releases'));
const AppPromo = lazy(() => import('./pages/AppPromo'));
const Boards = lazy(() => import('./pages/Boards'));
const Profile = lazy(() => import('./pages/Profile'));
const Docs = lazy(() => import('./pages/Docs'));

import Navbar from './components/Navbar';
import NotificationPanel from './components/NotificationPanel';
import CustomModal from './components/CustomModal';
import FeedbackForm from './components/FeedbackForm';
import { ToastProvider } from './components/Toast';

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
    <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
    <div className="text-slate-500 font-mono text-xs tracking-widest animate-pulse uppercase">Loading Session...</div>
  </div>
);

axios.defaults.withCredentials = true;

const AuthContext = createContext();
const ModalContext = createContext();

export const useAuth = () => useContext(AuthContext);
export const useModal = () => useContext(ModalContext);

const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', resolve: null });

  const showAlert = (title, message) => {
    return new Promise(resolve => {
      setModal({ isOpen: true, type: 'alert', title, message, resolve });
    });
  };

  const showConfirm = (title, message) => {
    return new Promise(resolve => {
      setModal({ isOpen: true, type: 'confirm', title, message, resolve });
    });
  };

  const handleConfirm = () => {
    modal.resolve(true);
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    modal.resolve(false);
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <CustomModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ModalContext.Provider>
  );
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useModal();

  const logout = React.useCallback(() => {
    setUser(null);
    setLoading(false);
    window.location.href = `${API_URL}/auth/logout`;
  }, []);

  const fetchProfile = React.useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/profile`);
      setUser(res.data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
      if (err.response?.status === 403) {
        await showAlert('Banned', 'Your account has been banned.');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = React.useCallback(() => {
    return fetchProfile();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const LoginSuccess = () => {
  const [searchParams] = useSearchParams();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');

    const exchange = async () => {
      if (user) {
        navigate('/', { replace: true });
        return;
      }

      if (!code) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        await axios.post(`${API_URL}/auth/exchange`, { code });
        await login();
        navigate('/', { replace: true });
      } catch {
        setError('Could not complete sign-in.');
      }
    };

    exchange();
  }, [searchParams, user, navigate, login]);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-xl font-mono tracking-widest animate-pulse">
        {error || 'LOGGING_IN...'}
      </div>
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <ModalProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
              <Navbar />
              <NotificationPanel />
              <div className="flex-1">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/login-success" element={<LoginSuccess />} />
                    <Route path="/" element={<Landing />} />
                    <Route path="/lb/:slug" element={<LeaderboardView />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/releases" element={<Releases />} />
                    <Route path="/app" element={<AppPromo />} />
                    <Route path="/boards" element={<Boards />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/docs" element={<Docs />} />
                  </Routes>
                </Suspense>
              </div>
              <FeedbackForm />
            </div>
          </Router>
        </AuthProvider>
      </ModalProvider>
    </ToastProvider>
  );
}

export default App;
