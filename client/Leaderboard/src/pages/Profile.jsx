import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import { useAuth, useModal } from '../App';
import { 
    User,
    Trophy,
    LogOut,
    Trash2,
    Mail,
    ShieldCheck,
    ChevronRight,
    Search,
    Zap,
    Heart,
    Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

const Profile = () => {
    const { user, logout } = useAuth();
    const { showAlert, showConfirm } = useModal();
    const navigate = useNavigate();
    const [joinedBoards, setJoinedBoards] = useState([]);
    const [stats, setStats] = useState({ heartsEarned: 0, totalSubmissions: 0 });
    const [loading, setLoading] = useState(true);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchData();
    }, [user, navigate]);

    const fetchData = async () => {
        try {
            const [boardsRes, profileRes] = await Promise.all([
                axios.get(`${API_URL}/auth/joined-leaderboards`),
                axios.get(`${API_URL}/auth/profile`)
            ]);
            setJoinedBoards(boardsRes.data);
            setStats(profileRes.data.stats || { heartsEarned: 0, totalSubmissions: 0 });
        } catch (err) {
            console.error('Failed to fetch profile data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleDeleteAccount = async () => {
        const ok = await showConfirm(
            'Delete Account', 
            'WARNING: This will permanently delete your account and all your leaderboard activity. This cannot be undone.'
        );
        if (!ok) return;

        const ok2 = await showConfirm(
            'Final Confirmation', 
            'Are you absolutely sure? Everything (likes, submissions, reports) will be purged.'
        );
        if (!ok2) return;

        try {
            await axios.delete(`${API_URL}/auth/delete-account`);
            showAlert('Success', 'Account deleted successfully');
            logout();
            navigate('/login');
        } catch {
            showAlert('Error', 'Failed to delete account');
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 pb-20 relative overflow-hidden">
            {/* Premium Background Blobs */}
            <motion.div 
                animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                    x: [-50, 50, -50],
                    y: [-20, 20, -20]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -z-10" 
            />
            <motion.div 
                animate={{ 
                    scale: [1.2, 1, 1.2],
                    rotate: [0, -90, 0],
                    x: [50, -50, 50],
                    y: [20, -20, 20]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full -z-10" 
            />
            
            <div className="max-w-4xl mx-auto px-6 pt-24 relative z-10">
                {/* Header Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass border-white/10 rounded-[2.5rem] p-8 md:p-12 mb-12 relative overflow-hidden group shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] bg-slate-900/40 backdrop-blur-2xl"
                >
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] -mr-40 -mt-40 rounded-full group-hover:bg-indigo-500/20 transition-all duration-1000" />
                    
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                            {user.picture && !imgError ? (
                                <img 
                                    src={user.picture} 
                                    alt={user.name} 
                                    className="w-32 h-32 rounded-3xl border-2 border-white/10 relative z-10 shadow-2xl object-cover"
                                    onError={() => setImgError(true)}
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-3xl border-2 border-white/10 bg-slate-900 flex items-center justify-center relative z-10 shadow-2xl">
                                    <User className="w-12 h-12 text-slate-700" />
                                </div>
                            )}
                            <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-2 rounded-xl border border-white/10 shadow-xl z-20">
                                <Zap className="w-4 h-4 text-white" />
                            </div>
                        </div>

                        <div className="text-center md:text-left flex-1">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none italic">{user.name}</h1>
                                {user.isAdmin && (
                                    <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 self-start mt-1">
                                        <ShieldCheck className="w-3 h-3" />
                                        Elite Admin
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-400 mb-6">
                                <Mail className="w-4 h-4" />
                                <span className="text-sm font-medium">{user.email}</span>
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl backdrop-blur-md">
                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Hearts Earned</p>
                                    <div className="flex items-center gap-2">
                                        <Heart className="w-4 h-4 text-red-500" />
                                        <span className="text-xl font-black text-white">{stats.heartsEarned}</span>
                                    </div>
                                </div>
                                <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Entries</p>
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-emerald-500" />
                                        <span className="text-xl font-black text-white">{stats.totalSubmissions}</span>
                                    </div>
                                </div>
                                <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Standing</p>
                                    <span className="text-xl font-black text-indigo-400">Competitive</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Sections */}
                <div className="space-y-12 relative z-10">
                    {/* Activity Section - Main Focus */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                Competitive Activity
                            </h2>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{joinedBoards.length} Total Boards</span>
                        </div>

                        <div className="space-y-4">
                            {loading ? (
                                Array(2).fill(0).map((_, i) => (
                                    <div key={i} className="h-24 bg-white/5 animate-pulse rounded-3xl" />
                                ))
                            ) : joinedBoards.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {joinedBoards.map((board, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <Link 
                                                to={`/lb/${board.slug}`}
                                                className="block glass border-white/5 rounded-3xl p-5 hover:border-indigo-500/40 transition-all hover:bg-indigo-500/[0.02] group shadow-xl bg-slate-900/20"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner text-indigo-400">
                                                            <Trophy className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-black text-white uppercase tracking-tighter text-base leading-none group-hover:text-indigo-400 transition-colors">{board.name}</h3>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <div className={`w-1 h-1 rounded-full ${board.isLive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                                <span className={`text-[8px] font-bold uppercase tracking-widest ${board.isLive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                    {board.isLive ? 'Live' : 'Closed'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="glass border-white/5 rounded-[3rem] p-12 text-center bg-slate-900/20 border-dashed border-2">
                                    <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-950 rounded-3xl flex items-center justify-center border border-white/5 mx-auto mb-8 shadow-2xl group relative">
                                        <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Search className="w-10 h-10 text-slate-600 relative z-10" />
                                    </div>
                                    <h3 className="font-black text-white uppercase tracking-tighter text-2xl mb-3 italic">Begin Your Journey</h3>
                                    <p className="text-slate-500 text-sm mb-10 max-w-xs mx-auto leading-relaxed font-medium">You haven't joined any competitive boards yet. Start your first challenge today.</p>
                                    <Link 
                                        to="/boards" 
                                        className="inline-flex items-center gap-3 bg-white text-slate-950 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <Trophy className="w-4 h-4" />
                                        Explore Global Boards
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Compact Account Control */}
                    <div className="pt-12 border-t border-white/5">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <button 
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.2em] transition-colors group"
                                >
                                    <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Sign Out
                                </button>
                                <button 
                                    onClick={handleDeleteAccount}
                                    className="flex items-center gap-2 text-[10px] font-black text-red-500/40 hover:text-red-500 uppercase tracking-[0.2em] transition-colors group"
                                >
                                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Delete Account
                                </button>
                            </div>
                            <div className="text-[9px] font-bold text-slate-700 uppercase tracking-[0.3em] flex items-center gap-4">
                                <span>EliteBoards v0.4.2</span>
                                <span>•</span>
                                <span>Secure Session</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
