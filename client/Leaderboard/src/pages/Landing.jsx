import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { Link } from 'react-router-dom';
import { useAuth, useModal } from '../App';
import { 
    Trophy, 
    Plus, 
    ArrowRight, 
    LayoutGrid, 
    Users, 
    Trash2, 
    Power, 
    PowerOff, 
    Search, 
    Crown, 
    Filter,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../utils/socketSingleton';

const Landing = () => {
    const { user } = useAuth();
    const { showAlert, showConfirm } = useModal();
    const [leaderboards, setLeaderboards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'live', 'maintenance'
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalBoards: 0,
        limit: 9
    });

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [entryMode, setEntryMode] = useState('manual');
    const [fields, setFields] = useState({ cgpa: true, sgpa: false, marks: true });
    const [ranking, setRanking] = useState({ mode: 'priority', primaryField: 'cgpa', secondaryField: 'marks' });
    const [verification, setVerification] = useState({
        level: 'none',
        requireIdCard: false,
        requireGradeCard: false,
        autoAcceptOnIdentityMatch: true,
    });

    const fetchLeaderboards = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/leaderboards`, {
                params: {
                    page,
                    limit: pagination.limit,
                    search: search.trim() || undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined
                }
            });
            setLeaderboards(res.data.leaderboards || []);
            if (res.data.pagination) {
                setPagination(res.data.pagination);
            }
        } catch (err) {
            console.error('Failed to fetch leaderboards:', err);
        } finally {
            setLoading(false);
        }
    }, [pagination.limit, search, statusFilter]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchLeaderboards(1);
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [fetchLeaderboards]);

    // Real-time socket listeners
    useEffect(() => {
        const socket = getSocket();

        const handleCreated = (newBoard) => {
            setLeaderboards(prev => {
                if (prev.some(lb => lb._id === newBoard._id)) return prev;
                return [newBoard, ...prev];
            });
            setPagination(prev => ({ ...prev, totalBoards: prev.totalBoards + 1 }));
        };

        const handleDeleted = (deletedId) => {
            setLeaderboards(prev => prev.filter(lb => lb._id !== deletedId));
            setPagination(prev => ({ ...prev, totalBoards: Math.max(0, prev.totalBoards - 1) }));
        };

        const handleStatusUpdated = ({ id, isLive, entryCount }) => {
            setLeaderboards(prev => prev.map(lb => {
                if (lb._id !== id) return lb;
                return {
                    ...lb,
                    isLive: isLive !== undefined ? isLive : lb.isLive,
                    entryCount: entryCount !== undefined ? entryCount : lb.entryCount,
                };
            }));
        };

        socket.on('leaderboardCreated', handleCreated);
        socket.on('leaderboardDeleted', handleDeleted);
        socket.on('leaderboardStatusUpdated', handleStatusUpdated);

        return () => {
            socket.off('leaderboardCreated', handleCreated);
            socket.off('leaderboardDeleted', handleDeleted);
            socket.off('leaderboardStatusUpdated', handleStatusUpdated);
        };
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/api/leaderboards/create`, {
                name: newName,
                entryMode,
                fields,
                ranking,
                verification,
            });
            showAlert('Success', 'Leaderboard created! Share the link with students.');
            setLeaderboards(prev => {
                if (prev.some(lb => lb._id === res.data._id)) return prev;
                return [res.data, ...prev];
            });
            setShowCreateModal(false);
            setNewName('');
            setEntryMode('manual');
            setFields({ cgpa: true, sgpa: false, marks: true });
            setRanking({ mode: 'priority', primaryField: 'cgpa', secondaryField: 'marks' });
            setVerification({
                level: 'none',
                requireIdCard: false,
                requireGradeCard: false,
                autoAcceptOnIdentityMatch: true,
            });
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
            await axios.delete(`${API_URL}/api/leaderboards/${id}`);
            setLeaderboards(prev => prev.filter(lb => lb._id !== id));
            showAlert('Deleted', 'Leaderboard has been removed.');
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to delete leaderboard');
        }
    };

    const handleToggleStatus = async (id, isCurrentlyLive, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const action = isCurrentlyLive ? 'Set to Maintenance?' : 'Set Leaderboard Live?';
        const msg = isCurrentlyLive
            ? 'Putting this leaderboard into maintenance mode will pause student submissions and edits.'
            : 'Making this leaderboard live will allow students to submit scores again.';
        const confirmBtn = isCurrentlyLive ? 'Pause Submissions' : 'Set Live';
        const confirmColor = isCurrentlyLive ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-emerald-600 hover:bg-emerald-500';

        const confirmed = await showConfirm(action, msg, confirmBtn, confirmColor);
        if (!confirmed) return;

        try {
            const res = await axios.post(`${API_URL}/api/leaderboards/toggle-status/${id}`, {});
            setLeaderboards(prev => prev.map(lb => lb._id === id ? { ...lb, isLive: res.data.isLive } : lb));
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to toggle status');
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLeaderboards(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Top Toolbar Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-mono tracking-tight flex items-center gap-3">
                            <Trophy className="w-8 h-8 text-indigo-400" />
                            Leaderboards
                        </h1>
                        <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest font-mono">
                            {pagination.totalBoards} Total
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm max-w-xl">
                        Real-time student rankings, cohort analytics, and competitive standings.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {user && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            Create Board
                        </button>
                    )}
                </div>
            </div>

            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search leaderboards by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5 self-start sm:self-auto">
                    {[
                        { id: 'all', label: 'All Boards' },
                        { id: 'live', label: 'Live' },
                        { id: 'maintenance', label: 'Maintenance' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                statusFilter === tab.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leaderboard Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass h-60 rounded-2xl animate-pulse bg-white/[0.02]" />
                    ))
                ) : leaderboards.length > 0 ? (
                    leaderboards.map((lb, index) => (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            key={lb._id}
                        >
                            <Link
                                to={`/lb/${lb.slug}`}
                                className="glass p-6 rounded-2xl block hover:border-indigo-500/50 group transition-all h-full flex flex-col justify-between"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="w-11 h-11 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            <Trophy className="w-5 h-5" />
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
                                            {(user?.isAdmin || user?.id === lb.createdBy) && (
                                                <button
                                                    onClick={(e) => handleToggleStatus(lb._id, lb.isLive, e)}
                                                    className={`p-1.5 rounded-lg transition-all ${
                                                        lb.isLive 
                                                            ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' 
                                                            : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                                    }`}
                                                    title={lb.isLive ? "Pause Submissions" : "Set Live"}
                                                >
                                                    {lb.isLive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                                                </button>
                                            )}
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                                lb.isLive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                            }`}>
                                                {lb.isLive ? 'Live' : 'Maintenance'}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <h2 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors uppercase font-mono line-clamp-1">
                                            {lb.name}
                                        </h2>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
                                            <Users className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">
                                                {lb.entryCount || 0} Submissions
                                            </span>
                                        </div>
                                        {lb.entryMode && (
                                            <span className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[9px] font-black text-indigo-300 uppercase tracking-widest">
                                                {lb.entryMode === 'upload' ? 'Doc Verified' : lb.entryMode === 'hybrid' ? 'Hybrid' : 'Direct Entry'}
                                            </span>
                                        )}
                                        {lb.ranking?.primaryField && (
                                            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                By {lb.ranking.primaryField}
                                            </span>
                                        )}
                                    </div>

                                    {/* Top Ranker Preview Snippet */}
                                    <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                                        {lb.topEntry ? (
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="relative flex-shrink-0">
                                                        {lb.topEntry.userPicture ? (
                                                            <img src={lb.topEntry.userPicture} alt={lb.topEntry.name} className="w-7 h-7 rounded-full border border-yellow-500/40 object-cover" referrerPolicy="no-referrer" />
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 text-xs font-bold font-mono">
                                                                {lb.topEntry.name?.charAt(0) || '#'}
                                                            </div>
                                                        )}
                                                        <Crown className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-yellow-400 leading-none mb-0.5">Rank #1 Leader</p>
                                                        <p className="text-xs font-bold text-white truncate font-mono">{lb.topEntry.name}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className="text-xs font-black font-mono text-yellow-400">
                                                        {typeof lb.topEntry.cgpa === 'number' ? `${lb.topEntry.cgpa.toFixed(2)} CGPA` : `${lb.topEntry.marks} Marks`}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between text-slate-500 py-0.5">
                                                <span className="text-[10px] font-bold uppercase tracking-widest italic">Awaiting first submission</span>
                                                <span className="text-[10px] font-mono font-bold text-indigo-400/80">Be #1 &rarr;</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-slate-500 group-hover:text-slate-300">
                                    <span className="text-xs font-bold tracking-widest uppercase">View Board</span>
                                    <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1.5 transition-transform" />
                                </div>
                            </Link>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center glass rounded-2xl">
                        <LayoutGrid className="w-12 h-12 mx-auto text-slate-700 mb-4" />
                        <p className="text-slate-400 font-mono text-sm">No leaderboards match the current criteria.</p>
                        {user && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                            >
                                Create New Leaderboard
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/5 pt-6">
                    <p className="text-xs text-slate-500 font-mono">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={pagination.currentPage <= 1}
                            className="p-2 glass rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                            disabled={pagination.currentPage >= pagination.totalPages}
                            className="p-2 glass rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Create Leaderboard Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="max-w-md w-full glass p-8 rounded-3xl space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white uppercase font-mono">New Leaderboard</h3>
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                className="text-slate-500 hover:text-white text-sm"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Board Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Batch 2025 MCS"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500/50 transition-colors text-sm"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entry Mode</label>
                                <select
                                    value={entryMode}
                                    onChange={(e) => setEntryMode(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500/50 transition-colors text-sm"
                                >
                                    <option value="manual">Manual only</option>
                                    <option value="upload">Upload only (Doc Verified)</option>
                                    <option value="hybrid">Hybrid (Both)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enabled Fields</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['cgpa', 'sgpa', 'marks'].map((field) => (
                                        <button
                                            key={field}
                                            type="button"
                                            onClick={() => setFields((prev) => ({ ...prev, [field]: !prev[field] }))}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                fields[field] 
                                                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' 
                                                    : 'bg-white/5 border-white/10 text-slate-500'
                                            }`}
                                        >
                                            {field}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Primary Ranking Field</label>
                                <select
                                    value={ranking.primaryField}
                                    onChange={(e) => setRanking((prev) => ({ ...prev, primaryField: e.target.value }))}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500/50 transition-colors text-sm"
                                >
                                    <option value="cgpa">CGPA</option>
                                    <option value="sgpa">SGPA</option>
                                    <option value="marks">Marks</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verification Level</label>
                                <select
                                    value={verification.level}
                                    onChange={(e) => {
                                        const level = e.target.value;
                                        setVerification((prev) => ({
                                            ...prev,
                                            level,
                                            requireIdCard: level !== 'none',
                                            requireGradeCard: level !== 'none',
                                        }));
                                    }}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500/50 transition-colors text-sm"
                                >
                                    <option value="none">No verification</option>
                                    <option value="identity_match">Identity match required</option>
                                    <option value="document_verification">Document verification required</option>
                                    <option value="manual_approval">Manual approval required</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-bold text-slate-400 text-xs uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] bg-indigo-600 hover:bg-indigo-500 transition-all text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20"
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
