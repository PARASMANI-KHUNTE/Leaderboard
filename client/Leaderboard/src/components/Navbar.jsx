import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import { useAuth, useModal } from '../App';
import { Trophy, LogOut, ShieldCheck, Bell, User, Trash2, Smartphone } from 'lucide-react';
import FeedbackForm from './FeedbackForm';
import NotificationCenter from './NotificationCenter';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { showAlert, showConfirm } = useModal();
    const navigate = useNavigate();
    const [imgError, setImgError] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="flex items-center gap-3 active:scale-95 transition-transform group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl shadow-lg border border-white/10 group-hover:shadow-indigo-500/20 transition-all">
                                <Trophy className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-black bg-gradient-to-r from-white via-indigo-200 to-slate-400 bg-clip-text text-transparent tracking-tighter uppercase font-mono leading-none">
                                EliteBoards
                            </span>
                            <span className="text-[8px] font-bold text-indigo-400/60 uppercase tracking-[0.3em] leading-none mt-1">
                                Premium Rankings
                            </span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link to="/app" className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 font-bold text-xs uppercase tracking-widest transition-colors mr-2 group">
                            <Smartphone className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="hidden sm:inline">Download App</span>
                        </Link>

                        {user ? (
                            <div className="flex items-center gap-4 border-l border-white/10 pl-4">
                                {user.isAdmin && (
                                    <Link to="/admin" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-widest transition-colors mr-2 border-r border-white/10 pr-4">
                                        <ShieldCheck className="w-4 h-4" />
                                        <span className="hidden sm:inline">Admin</span>
                                    </Link>
                                )}
                                <NotificationCenter />
                                <div className="flex items-center gap-3">
                                    {(user.picture && !imgError) ? (
                                        <img
                                            src={user.picture}
                                            alt={user.name}
                                            className="w-8 h-8 rounded-lg border border-white/10"
                                            onError={() => setImgError(true)}
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-slate-500">
                                            <User className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="hidden sm:block">
                                        <p className="text-xs font-black text-white uppercase tracking-tight leading-none mb-0.5">{user.name}</p>
                                        <button onClick={handleLogout} className="flex items-center gap-1 text-[10px] font-bold text-red-500/70 hover:text-red-500 uppercase tracking-widest transition-colors mb-2">
                                            <LogOut className="w-3 h-3" />
                                            Logout
                                        </button>
                                        <div className="pt-2 border-t border-white/5">
                                            <button
                                                onClick={async () => {
                                                    const ok = await showConfirm('Delete Account', 'WARNING: This will permanently delete your account and all your leaderboard activity. This cannot be undone.');
                                                    if (!ok) return;
                                                    const ok2 = await showConfirm('Final Confirmation', 'Are you absolutely sure? Everything (likes, submissions, reports) will be purged.');
                                                    if (!ok2) return;

                                                    try {
                                                        await axios.delete(`${API_URL}/auth/delete-account`, {
                                                            headers: { Authorization: `Bearer ${user.token}` }
                                                        });
                                                        logout();
                                                        navigate('/login');
                                                    } catch (err) {
                                                        showAlert('Error', 'Failed to delete account');
                                                    }
                                                }}
                                                className="flex items-center gap-1 text-[9px] font-bold text-slate-600 hover:text-red-500/80 uppercase tracking-[0.15em] transition-all opacity-60 hover:opacity-100"
                                            >
                                                <Trash2 className="w-2.5 h-2.5" />
                                                Danger: Delete Account
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors font-medium text-sm"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
