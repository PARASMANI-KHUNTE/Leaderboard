import React, { createContext, useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config';
import Landing from './pages/Landing';
import LeaderboardView from './pages/LeaderboardView';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';
import NotificationPanel from './components/NotificationPanel';
import CustomModal from './components/CustomModal';
import FeedbackForm from './components/FeedbackForm';
import { ToastProvider } from './components/Toast';

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
  // ... (AuthProvider logic)
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token) => {
    try {
      const res = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser({ ...res.data, token });
    } catch (err) {
      console.error('Failed to fetch profile', err);
      if (err.response?.status === 403) {
        showAlert('Banned', 'Your account has been banned.');
      }
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token) => {
    localStorage.setItem('token', token);
    fetchProfile(token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

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

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      login(token);
    } else if (!user) {
      navigate('/login');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-xl font-mono tracking-widest animate-pulse">LOGGING_IN...</div>
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
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/login-success" element={<LoginSuccess />} />
                  <Route path="/" element={<Landing />} />
                  <Route path="/lb/:slug" element={<LeaderboardView />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                </Routes>
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
