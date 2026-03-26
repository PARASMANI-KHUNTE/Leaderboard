import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { Link } from 'react-router-dom';
import { useAuth, useModal } from '../App';
import { Trophy, Plus, ArrowRight, LayoutGrid, Users, Trash2, Power, PowerOff, Download, ExternalLink, Github, Linkedin, Mail, Globe, Zap, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';

const Landing = () => {
    const { user } = useAuth();
    const { showAlert, showConfirm } = useModal();
    const [leaderboards, setLeaderboards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        const fetchLeaderboards = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/leaderboards`);
                setLeaderboards(res.data);
            } catch (err) {
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboards();

        // Real-time listeners
        const socket = io(API_URL);

        socket.on('leaderboardCreated', (newBoard) => {
            setLeaderboards(prev => [newBoard, ...prev]);
        });

        socket.on('leaderboardDeleted', (deletedId) => {
            setLeaderboards(prev => prev.filter(lb => lb._id !== deletedId));
        });

        socket.on('leaderboardStatusUpdated', ({ id, isLive }) => {
            setLeaderboards(prev => prev.map(lb => lb._id === id ? { ...lb, isLive } : lb));
        });

        return () => socket.disconnect();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/api/leaderboards/create`,
                { name: newName },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            showAlert('Success', 'Leaderboard created! Share the link with students.');
            setLeaderboards([res.data, ...leaderboards]);
            setShowCreateModal(false);
            setNewName('');
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to create leaderboard');
        }
    };

    const handleDelete = async (id, e) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = await showConfirm(
            "Delete Leaderboard?",
            "This will permanently delete the leaderboard and all associated entries. This action cannot be undone.",
            "Delete Everything",
            "bg-red-600 hover:bg-red-500"
        );

        if (!confirmed) return;

        try {
            await axios.delete(`${API_URL}/api/leaderboards/${id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setLeaderboards(leaderboards.filter(lb => lb._id !== id));
            showAlert('Deleted', 'Leaderboard has been removed.');
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to delete leaderboard');
        }
    };

    const handleToggleStatus = async (id, e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const res = await axios.post(`${API_URL}/api/leaderboards/toggle-status/${id}`, {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setLeaderboards(leaderboards.map(lb => lb._id === id ? { ...lb, isLive: res.data.isLive } : lb));
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to toggle status');
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-between">
            <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            <div className="text-center space-y-4">
                <div className="flex flex-col items-center justify-center gap-2 mb-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full animate-pulse">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">Real-time Systems Active</span>
                    </div>
                </div>
                <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight">
                    <span className="bg-gradient-to-r from-white via-indigo-200 to-slate-400 bg-clip-text text-transparent uppercase font-mono italic">Elite</span>
                    <span className="text-indigo-500 text-glow uppercase font-mono">Boards</span>
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
                    The ultimate student ranking platform. Create, share, and track performance in complete real-time.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                    <a 
                        href="/EliteLeaderboard.apk"
                        download="EliteLeaderboard.apk"
                        className="group relative flex w-full sm:w-auto items-center justify-center gap-4 px-8 py-4 bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-2xl text-white hover:from-indigo-400 hover:to-indigo-600 transition-all duration-300 shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_50px_rgba(99,102,241,0.5)] active:scale-95 border border-indigo-400/30 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                        <Download className="w-6 h-6 relative z-10 group-hover:-translate-y-1 transition-transform duration-300" />
                        <div className="relative z-10 flex flex-col items-start leading-none text-left">
                            <span className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold mb-1">Android App</span>
                            <span className="font-black text-lg tracking-wide">Direct Download</span>
                        </div>
                    </a>
                    <a 
                        href="https://expo.dev/accounts/parasmani/projects/eliteboards-mobile/builds/19a4d54f-08af-482c-8fe3-a74833a4f9fe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex w-full sm:w-auto items-center justify-center gap-4 px-8 py-4 bg-slate-800/80 backdrop-blur-md rounded-2xl text-slate-300 hover:text-white transition-all duration-300 hover:bg-slate-700/80 shadow-[0_0_30px_rgba(30,41,59,0.5)] hover:shadow-[0_0_50px_rgba(99,102,241,0.15)] active:scale-95 border border-slate-700 hover:border-indigo-500/50"
                    >
                        <ExternalLink className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 transition-colors duration-300" />
                        <div className="flex flex-col items-start leading-none text-left">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 group-hover:text-indigo-300 font-bold mb-1 transition-colors duration-300">Alternative</span>
                            <span className="font-black text-lg tracking-wide">Expo Build</span>
                        </div>
                    </a>
                    {user && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="group relative flex w-full sm:w-auto items-center justify-center gap-4 px-8 py-4 bg-indigo-600 rounded-2xl text-white hover:bg-indigo-500 transition-all duration-300 shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_rgba(79,70,229,0.5)] active:scale-95 border border-indigo-400/30 overflow-hidden"
                        >
                            <Plus className="w-6 h-6 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                            <div className="relative z-10 flex flex-col items-start leading-none text-left">
                                <span className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold mb-1">Management</span>
                                <span className="font-black text-lg tracking-wide">Create New Board</span>
                            </div>
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="glass h-48 animate-pulse" />)
                ) : leaderboards.length > 0 ? (
                    leaderboards.map((lb, index) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            key={lb._id}
                        >
                            <Link
                                to={`/lb/${lb.slug}`}
                                className="glass p-6 block hover:border-indigo-500/50 group transition-all h-full flex flex-col justify-between"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            <Trophy className="w-6 h-6" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(user?.isAdmin || user?.id === lb.createdBy) && (
                                                <button
                                                    onClick={(e) => handleDelete(lb._id, e)}
                                                    className="p-1.5 bg-red-500/10 rounded-lg text-red-500 hover:bg-red-500/20 transition-all"
                                                    title="Delete Board"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {user?.isAdmin && (
                                                <button
                                                    onClick={(e) => handleToggleStatus(lb._id, e)}
                                                    className={`p-1.5 rounded-lg transition-all ${lb.isLive ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
                                                    title={lb.isLive ? "Set Maintenance (Down)" : "Set Live"}
                                                >
                                                    {lb.isLive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                                                </button>
                                            )}
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${lb.isLive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {lb.isLive ? 'Live' : 'Maintenance'}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors uppercase font-mono">
                                        {lb.name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-3.5 h-3.5 text-slate-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                            {lb.entryCount || 0} Submissions
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-8 flex items-center justify-between text-slate-500 group-hover:text-slate-300">
                                    <span className="text-xs font-bold tracking-widest uppercase">View Board</span>
                                    <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-2 transition-transform" />
                                </div>
                            </Link>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center glass">
                        <LayoutGrid className="w-12 h-12 mx-auto text-slate-700 mb-4" />
                        <p className="text-slate-500 font-mono italic">No leaderboards found. Be the first to create one!</p>
                    </div>
                )}
            </div>

            {/* About Section */}
            <div className="pt-20 pb-10 border-t border-white/10 mt-20">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-5xl font-black text-white uppercase font-mono tracking-tight mb-4">How <span className="text-indigo-500">EliteBoards</span> Works</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg">Three simple steps to gamify your community and track performance securely.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="glass p-8 rounded-3xl relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                            <Zap className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">1. Create a Board</h3>
                        <p className="text-slate-400 leading-relaxed text-sm">
                            Instantly generate a real-time leaderboard for your batch, classroom, or competition. Custom links are generated in seconds.
                        </p>
                    </div>
                    <div className="glass p-8 rounded-3xl relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                            <Users className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">2. Share & Compete</h3>
                        <p className="text-slate-400 leading-relaxed text-sm">
                            Share the unique link with participants. Users can seamlessly submit their scores or metrics through the web or our mobile app.
                        </p>
                    </div>
                    <div className="glass p-8 rounded-3xl relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                            <Activity className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">3. Track in Real-time</h3>
                        <p className="text-slate-400 leading-relaxed text-sm">
                            Watch the rankings update live. No page refreshes needed. Perfect for hackathons, quizzes, and live gamified learning.
                        </p>
                    </div>
                </div>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="max-w-md w-full glass p-8 space-y-6"
                    >
                        <h2 className="text-2xl font-bold text-white">New Leaderboard</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Board Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Batch 2025 MCS"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-colors"
                                    required
                                />
                            </div>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-bold text-slate-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] bg-indigo-600 hover:bg-indigo-500 transition-all text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20"
                                >
                                    Create Board
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
            </div>

            {/* Footer */}
            <footer className="w-full border-t border-white/5 bg-[#020617]/50 pt-16 pb-8 mt-auto backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                        <div className="flex flex-col items-center md:items-start gap-2">
                            <div className="flex items-center gap-2">
                                <span className="bg-gradient-to-r from-white via-indigo-200 to-slate-400 bg-clip-text text-transparent uppercase font-mono italic text-2xl font-black">Elite</span>
                                <span className="text-indigo-500 text-glow uppercase font-mono text-2xl font-black">Boards</span>
                            </div>
                            <p className="text-slate-400 text-sm max-w-sm text-center md:text-left mt-2 leading-relaxed">Empowering student communities with real-time competitive ranking systems.</p>
                        </div>
                        <div className="flex flex-col items-center md:items-end gap-4">
                            <span className="text-slate-600 font-bold uppercase tracking-widest text-xs">Developed by</span>
                            <div className="flex items-center gap-4">
                                <a href="https://github.com/PARASMANI-KHUNTE" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-all p-3 glass rounded-full hover:bg-white/10 hover:-translate-y-1 duration-300" title="GitHub">
                                    <Github className="w-5 h-5" />
                                </a>
                                <a href="https://www.linkedin.com/in/parasmani-khunte-330488228/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-400 transition-all p-3 glass rounded-full hover:bg-white/10 hover:-translate-y-1 duration-300" title="LinkedIn">
                                    <Linkedin className="w-5 h-5" />
                                </a>
                                <a href="mailto:parasmanikhunte@gmail.com" className="text-slate-400 hover:text-teal-400 transition-all p-3 glass rounded-full hover:bg-white/10 hover:-translate-y-1 duration-300" title="Email">
                                    <Mail className="w-5 h-5" />
                                </a>
                                <a href="https://parasmanikhunte.onrender.com/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400 transition-all p-3 glass rounded-full hover:bg-white/10 hover:-translate-y-1 duration-300" title="Portfolio">
                                    <Globe className="w-5 h-5" />
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="text-center text-slate-500 font-mono text-xs border-t border-white/5 pt-8">
                        <p>&copy; {new Date().getFullYear()} EliteBoards. Designed & Built by Parasmani Khunte.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
