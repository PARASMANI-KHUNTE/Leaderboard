import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { Link } from 'react-router-dom';
import { useAuth, useModal } from '../App';
import { Trophy, Plus, ArrowRight, LayoutGrid, Users, Trash2, Power, PowerOff } from 'lucide-react';
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
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
                {user && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Create New Board
                    </button>
                )}
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
    );
};

export default Landing;
