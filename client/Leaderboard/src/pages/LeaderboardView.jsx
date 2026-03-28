import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import API_URL from '../config';
import { useAuth, useModal } from '../App';
import LeaderboardTable from '../components/LeaderboardTable';
import EntryForm from '../components/EntryForm';
import { Trophy, TrendingUp, Users, Share2, ArrowLeft, Eye, EyeOff, Heart, AlertTriangle, Flag, ChevronDown, ChevronUp, Trash2, Power, PowerOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const LeaderboardView = () => {
    const { slug } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useModal();
    const PAGE_LIMIT = 20;
    const [leaderboard, setLeaderboard] = useState(null);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageCursor, setPageCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [reportModal, setReportModal] = useState(null);
    const [reportReason, setReportReason] = useState('');
    const [showCelebration, setShowCelebration] = useState(false);
    const tableRef = useRef(null);
    const socketRef = useRef(null);
    const refetchTimerRef = useRef(null);
    const activeLeaderboardIdRef = useRef(null);

    const handleSuccess = (subData) => {
        setEditingEntry(null);
        setIsFormOpen(false);

        // Only celebrate for "Promoted" students (exactly 0 CGPA)
        if (subData && subData.cgpa === 0) {
            setShowCelebration(true);

            // Play sound
            const audio = new Audio('/success.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));

            // Auto hide after 5 seconds
            setTimeout(() => setShowCelebration(false), 5000);
        }
    };

    useEffect(() => {
        if (editingEntry) setIsFormOpen(true);
    }, [editingEntry]);

    useEffect(() => {
        const socket = io(API_URL);
        socketRef.current = socket;

        const fetchEntriesPage = async (cursorToUse, { reset }) => {
            const activeLeaderboardId = activeLeaderboardIdRef.current;
            if (!activeLeaderboardId) return;

            try {
                if (reset) setLoading(true);
                else setLoadingMore(true);

                const params = { limit: PAGE_LIMIT };
                if (cursorToUse) params.cursor = cursorToUse;

                const res = await axios.get(`${API_URL}/api/leaderboard/${activeLeaderboardId}`, { params });
                const { items, nextCursor, hasMore } = res.data;

                if (reset) {
                    setEntries(items);
                } else {
                    setEntries((prev) => [...prev, ...items]);
                }

                setPageCursor(nextCursor);
                setHasMore(hasMore);
            } catch (err) {
                console.error('Error loading entries:', err);
            } finally {
                if (reset) setLoading(false);
                else setLoadingMore(false);
            }
        };

        const scheduleRefetch = () => {
            if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
            refetchTimerRef.current = setTimeout(() => {
                fetchEntriesPage(null, { reset: true });
            }, 500);
        };

        // Register realtime listeners immediately.
        // We scope by `activeLeaderboardIdRef.current` so failures in earlier axios calls
        // cannot prevent listener registration.
        const handleLeaderboardChanged = ({ leaderboardId: changedId }) => {
            if (!changedId) return;
            if (changedId === activeLeaderboardIdRef.current) scheduleRefetch();
        };

        const handleLeaderboardDeleted = (deletedId) => {
            if (!deletedId) return;
            if (deletedId === activeLeaderboardIdRef.current) {
                showAlert('Board Deleted', 'This leaderboard has been removed by an admin.');
                navigate('/');
            }
        };

        const handleLeaderboardStatusUpdated = ({ id, isLive }) => {
            if (!id) return;
            if (id === activeLeaderboardIdRef.current) {
                setLeaderboard(prev => ({ ...prev, isLive }));
            }
        };

        socket.on('leaderboardChanged', handleLeaderboardChanged);
        socket.on('leaderboardDeleted', handleLeaderboardDeleted);
        socket.on('leaderboardStatusUpdated', handleLeaderboardStatusUpdated);

        const fetchData = async () => {
            try {
                // Get leaderboard details
                const lbRes = await axios.get(`${API_URL}/api/leaderboards/${slug}`);
                setLeaderboard(lbRes.data);
                activeLeaderboardIdRef.current = lbRes.data._id;

                socket.emit('joinLeaderboard', lbRes.data._id);

                // Initial entries load (page 1)
                setPageCursor(null);
                setHasMore(false);
                await fetchEntriesPage(null, { reset: true });
            } catch (err) {
                console.error('Error:', err);
                setLoading(false);
            }
        };

        fetchData();

        return () => {
            if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
            socket.off('leaderboardChanged', handleLeaderboardChanged);
            socket.off('leaderboardDeleted', handleLeaderboardDeleted);
            socket.off('leaderboardStatusUpdated', handleLeaderboardStatusUpdated);
            socket.disconnect();
        };
    }, [slug]);

    const handleToggleStatus = async () => {
        try {
            const res = await axios.post(`${API_URL}/api/leaderboards/toggle-status/${leaderboard._id}`, {});
            setLeaderboard(res.data);
            showAlert('Updated', `Leaderboard is now ${res.data.isLive ? 'LIVE' : 'DOWN'}`);
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to toggle status');
        }
    };

    const handleDeleteBoard = async () => {
        const confirmed = await showConfirm(
            "Delete Entire Leaderboard?",
            "This will permanently delete this board and all student entries. This action CANNOT be undone.",
            "Delete Dashboard",
            "bg-red-600 hover:bg-red-500"
        );

        if (!confirmed) return;

        try {
            await axios.delete(`${API_URL}/api/leaderboards/${leaderboard._id}`);
            showAlert('Deleted', 'Leaderboard and all data removed.');
            navigate('/');
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to delete leaderboard');
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        showAlert('Copied', 'Link copied to clipboard!');
    };


    const handleReport = async (e) => {
        e.preventDefault();
        if (!user) return showAlert('Login Required', 'Please login to report');
        try {
            await axios.post(`${API_URL}/api/reports/submit`, {
                entryId: reportModal,
                reason: reportReason
            });
            showAlert('Report Received', 'Report submitted. Admins will review it.');
            setReportModal(null);
            setReportReason('');
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to submit report');
        }
    };

    const handleDelete = async (id) => {
        const ok = await showConfirm('Delete Entry', 'Are you sure you want to delete your entry?');
        if (!ok) return;
        try {
            await axios.delete(`${API_URL}/api/leaderboard/delete/${id}`);
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to delete entry');
        }
    };

    const handleLoadMore = async () => {
        if (!leaderboard?._id) return;
        if (!pageCursor) return;
        if (loadingMore) return;

        try {
            setLoadingMore(true);
            const params = { limit: PAGE_LIMIT, cursor: pageCursor };
            const res = await axios.get(`${API_URL}/api/leaderboard/${leaderboard._id}`, { params });
            const { items, nextCursor, hasMore } = res.data;

            setEntries((prev) => [...prev, ...items]);
            setPageCursor(nextCursor);
            setHasMore(hasMore);
        } catch (err) {
            console.error('Error loading more entries:', err);
            showAlert('Error', err.response?.data?.message || 'Failed to load more');
        } finally {
            setLoadingMore(false);
        }
    };

    if (loading) return <div className="text-center py-20 font-mono animate-pulse">LOADING_DATA...</div>;
    if (!leaderboard) return <div className="text-center py-20 font-mono">LEADERBOARD_NOT_FOUND</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Back to Explore</span>
                </Link>

                <div className="flex items-center gap-3">
                    {user && (user.isAdmin || user.id === leaderboard.createdBy) && (
                        <>
                            <button
                                onClick={handleToggleStatus}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border ${leaderboard.isLive
                                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'
                                    : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                    }`}
                                title={leaderboard.isLive ? "Set Maintenance (Down)" : "Set Live"}
                            >
                                {leaderboard.isLive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                {leaderboard.isLive ? 'SET DOWN' : 'SET LIVE'}
                            </button>
                            <button
                                onClick={handleDeleteBoard}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600/10 border border-red-600/20 hover:bg-red-600/20 text-red-500 rounded-xl text-xs font-bold transition-all active:scale-95"
                                title="Delete Entire Leaderboard"
                            >
                                <Trash2 className="w-4 h-4" />
                                DELETE BOARD
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            showAlert('Copied', 'Link copied!');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                    >
                        <Share2 className="w-4 h-4" />
                        SHARE
                    </button>
                </div>
            </div>

            <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-3">
                    <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase font-mono">
                        <span className="text-indigo-500 italic">Elite</span> {leaderboard.name}
                    </h1>
                    {!leaderboard.isLive && (
                        <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">Down</span>
                    )}
                </div>
                <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto italic">
                    Live updates of student performance
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass p-6 space-y-6 sticky top-24 overflow-hidden">
                        <button
                            onClick={() => setIsFormOpen(!isFormOpen)}
                            className="w-full flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <TrendingUp className={`transition-colors ${isFormOpen ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                                <h2 className={`text-xl font-bold font-mono uppercase transition-colors ${isFormOpen ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                                    {editingEntry ? 'Edit Entry' : 'Submit Entry'}
                                </h2>
                            </div>
                            <div className={`p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-all ${isFormOpen ? 'rotate-180 text-indigo-400' : 'text-slate-500'}`}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </button>

                        <AnimatePresence>
                            {isFormOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                    animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
                                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                    className="space-y-6 pt-6 border-t border-white/10"
                                >
                                    {leaderboard.isLive ? (
                                        user ? (
                                            <EntryForm
                                                leaderboardId={leaderboard._id}
                                                editingEntry={editingEntry}
                                                entries={entries}
                                                onCancel={() => {
                                                    setEditingEntry(null);
                                                    setIsFormOpen(false);
                                                }}
                                                onSuccess={handleSuccess}
                                            />
                                        ) : (
                                            <div className="text-center py-8 space-y-4 font-mono">
                                                <p className="text-slate-400 text-sm">Please login to participate.</p>
                                                <a href="/login" className="inline-block px-6 py-2 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 transition-colors">LOGIN</a>
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-center py-12 space-y-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                                            <EyeOff className="w-12 h-12 mx-auto text-red-500/50" />
                                            <div className="space-y-1">
                                                <p className="text-red-400 font-bold uppercase tracking-widest">Submissions Closed</p>
                                                <p className="text-slate-500 text-xs">This board is currently under maintenance.</p>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass p-4 text-center">
                            <Users className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
                            <p className="text-2xl font-black">{entries.length}</p>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Students</p>
                        </div>
                        <div className="glass p-4 text-center">
                            <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                            <p className="text-2xl font-black font-mono">{entries[0]?.cgpa ? entries[0].cgpa.toFixed(2) : '0.00'}</p>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Top Score</p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div ref={tableRef} className="glass overflow-hidden shadow-2xl border-indigo-500/10">
                        <LeaderboardTable
                            entries={entries}
                            loading={loading}
                            leaderboardCreatorId={leaderboard?.createdBy}
                            onEdit={(entry) => setEditingEntry(entry)}
                            onDelete={handleDelete}
                            onOpenReport={setReportModal}
                        />
                    </div>

                    {hasMore && (
                        <div className="flex justify-center py-2">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition-all text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95"
                            >
                                {loadingMore ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Celebration Overlay */}
            <AnimatePresence>
                {showCelebration && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[3000] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0.5, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            className="text-center space-y-8"
                        >
                            <img
                                src="/success.gif"
                                alt="Success Celebration"
                                className="w-64 h-64 mx-auto rounded-3xl shadow-2xl shadow-indigo-500/50"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    console.log('GIF not found in /public/success.gif');
                                }}
                            />
                            <div className="space-y-4">
                                <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter italic animate-pulse">
                                    LEGENDARY_SUBMISSION!
                                </h2>
                                <p className="text-indigo-400 font-mono text-xl tracking-widest uppercase font-bold">
                                    Your Rank is being Calculated...
                                </p>
                            </div>
                        </motion.div>

                        {/* Fake loading/progress bar for dramatic effect */}
                        <div className="mt-12 w-64 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 4 }}
                                className="h-full bg-indigo-500"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals moved to top-level for clipping fix */}

            <AnimatePresence>
                {reportModal && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md glass p-8 space-y-6"
                        >
                            <div className="flex items-center gap-4 text-red-500">
                                <AlertTriangle className="w-10 h-10" />
                                <div>
                                    <h3 className="text-xl font-bold uppercase font-mono">Report Entry</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Help us maintain integrity</p>
                                </div>
                            </div>
                            <form onSubmit={handleReport} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reason for Report</label>
                                    <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-red-500/50 transition-all font-mono appearance-none">
                                        <option value="" className="bg-slate-900">Select a reason...</option>
                                        <option value="Fake Name" className="bg-slate-900">Fake Name</option>
                                        <option value="Suspicious CGPA" className="bg-slate-900">Suspicious CGPA</option>
                                        <option value="Duplicate Entry" className="bg-slate-900">Duplicate Entry</option>
                                        <option value="Inappropriate Content" className="bg-slate-900">Inappropriate Content</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setReportModal(null)} className="flex-1 py-3 px-6 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">Cancel</button>
                                    <button type="submit" className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95">Submit Report</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LeaderboardView;
