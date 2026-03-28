import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { Link } from 'react-router-dom';
import { useAuth, useModal } from '../App';
import { Trophy, ArrowRight, Users, Trash2, Power, PowerOff, Search, ChevronLeft, ChevronRight, Filter, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Boards = () => {
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

    const fetchLeaderboards = async (page = 1) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/leaderboards`, {
                params: {
                    page,
                    limit: pagination.limit,
                    search,
                    status: statusFilter !== 'all' ? statusFilter : undefined
                }
            });
            setLeaderboards(res.data.leaderboards);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error('Error:', err);
            showAlert('Error', 'Failed to fetch leaderboards');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchLeaderboards(1);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search, statusFilter]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLeaderboards(newPage);
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
            fetchLeaderboards(pagination.currentPage);
            showAlert('Deleted', 'Leaderboard has been removed.');
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to delete leaderboard');
        }
    };

    const handleToggleStatus = async (id, e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            await axios.post(`${API_URL}/api/leaderboards/toggle-status/${id}`, {});
            fetchLeaderboards(pagination.currentPage);
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to toggle status');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 pt-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
                
                {/* Header Section */}
                <div className="space-y-4">
                    <h1 className="text-4xl sm:text-5xl font-black text-white uppercase font-mono tracking-tight">
                        Explore <span className="text-indigo-500">Leaderboards</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl font-medium leading-relaxed">
                        Search and filter through our community leaderboards. Track progress, monitor performance, and stay ahead in real-time.
                    </p>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-6 glass rounded-[2rem] border-white/5 bg-white/[0.02]">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                            type="text"
                            placeholder="Search by board name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-indigo-500/50 transition-all text-sm font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl">
                            <Filter className="w-4 h-4 text-slate-500" />
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-transparent outline-none text-sm font-bold uppercase tracking-widest text-slate-300 cursor-pointer"
                            >
                                <option value="all" className="bg-slate-900">All Status</option>
                                <option value="live" className="bg-slate-900 text-green-400">Live Only</option>
                                <option value="maintenance" className="bg-slate-900 text-red-400">Maintenance</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Boards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="glass h-64 rounded-2xl animate-pulse bg-white/5 border-white/5" />
                        ))
                    ) : leaderboards.length > 0 ? (
                        <AnimatePresence mode="popLayout">
                            {leaderboards.map((lb, index) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    key={lb._id}
                                >
                                    <Link
                                        to={`/lb/${lb.slug}`}
                                        className="gap-6 flex flex-col justify-between p-6 glass rounded-2xl hover:border-indigo-500/50 transition-all group h-full relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                        
                                        <div className="space-y-4 relative z-10">
                                            <div className="flex items-center justify-between">
                                                <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                                    <Trophy className="w-6 h-6" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {(user?.isAdmin || user?.id === lb.createdBy) && (
                                                        <button
                                                            onClick={(e) => handleDelete(lb._id, e)}
                                                            className="p-1.5 bg-red-500/10 rounded-lg text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20"
                                                            title="Delete Board"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {user?.isAdmin && (
                                                        <button
                                                            onClick={(e) => handleToggleStatus(lb._id, e)}
                                                            className={`p-1.5 rounded-lg transition-all border ${lb.isLive ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'}`}
                                                            title={lb.isLive ? "Set Maintenance" : "Set Live"}
                                                        >
                                                            {lb.isLive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                                                        </button>
                                                    )}
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${lb.isLive ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'bg-red-500/20 text-red-400 border-red-500/20'}`}>
                                                        {lb.isLive ? 'Live' : 'Maintenance'}
                                                    </span>
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors uppercase font-mono line-clamp-1 py-1">
                                                {lb.name}
                                            </h3>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 w-fit">
                                                <Users className="w-4 h-4 text-slate-500" />
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">
                                                    {lb.entryCount || 0} Submissions
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-slate-500 group-hover:text-white transition-colors relative z-10">
                                            <span className="text-[10px] font-bold tracking-widest uppercase">Explore Details</span>
                                            <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-2 transition-transform text-indigo-500" />
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <div className="col-span-full py-32 text-center glass rounded-3xl border-white/5 bg-white/[0.01]">
                            <LayoutGrid className="w-16 h-16 mx-auto text-slate-700 mb-6 opacity-20" />
                            <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-2">No Matching Boards</h2>
                            <p className="text-slate-500 font-mono italic text-sm">Be the first to create one or adjust your filters!</p>
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-12">
                        <button 
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={pagination.currentPage === 1}
                            className="p-3.5 rounded-2xl glass border-white/5 hover:border-indigo-500/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all group"
                        >
                            <ChevronLeft className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                        </button>

                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-[2rem] border border-white/5 shadow-inner">
                            {[...Array(pagination.totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => handlePageChange(i + 1)}
                                    className={`w-10 h-10 rounded-xl font-mono text-sm font-bold transition-all ${
                                        pagination.currentPage === i + 1 
                                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-600/40 scale-110 border border-white/20' 
                                        : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                            disabled={pagination.currentPage === pagination.totalPages}
                            className="p-3.5 rounded-2xl glass border-white/5 hover:border-indigo-500/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all group"
                        >
                            <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Boards;
