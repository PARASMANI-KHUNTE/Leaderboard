import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { Link } from 'react-router-dom';
import { useAuth, useModal } from '../App';
import { Trophy, Plus, ArrowRight, LayoutGrid, Users, Trash2, Power, PowerOff, Download, Github, Linkedin, Mail, Globe, Zap, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';

const Landing = () => {
    const { user } = useAuth();
    const { showAlert, showConfirm } = useModal();
    const [leaderboards, setLeaderboards] = useState([]);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        const fetchLeaderboards = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/leaderboards?limit=3`);
                setLeaderboards(res.data.leaderboards);
            } catch (err) {
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboards();

        // Real-time listeners
        const socket = io(API_URL, {
            withCredentials: true,
        });

        socket.on('leaderboardCreated', (newBoard) => {
            setLeaderboards(prev => [newBoard, ...prev].slice(0, 3));
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
                {
                    name: newName,
                    entryMode,
                    fields,
                    ranking,
                    verification,
                }
            );
            showAlert('Success', 'Leaderboard created! Share the link with students.');
            setLeaderboards((prev) => [res.data, ...prev]);
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
            setLeaderboards((prev) => prev.filter(lb => lb._id !== id));
            showAlert('Deleted', 'Leaderboard has been removed.');
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to delete leaderboard');
        }
    };

    const handleToggleStatus = async (id, e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const res = await axios.post(`${API_URL}/api/leaderboards/toggle-status/${id}`, {});
            setLeaderboards((prev) => prev.map((lb) => lb._id === id ? { ...lb, isLive: res.data.isLive } : lb));
        } catch (err) {
            showAlert('Error', err.response?.data?.message || 'Failed to toggle status');
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-between">
            <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            <div className="text-center space-y-8 relative py-20">
                {/* Background Glows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full -z-10 animate-pulse"></div>
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/5 blur-[100px] rounded-full -z-10"></div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center justify-center gap-4 mb-4"
                >
                    <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full backdrop-blur-md">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Trusted by 500+ Students</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">Real-time Systems Active</span>
                    </div>
                </motion.div>

                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[0.9]"
                >
                    <span className="bg-gradient-to-r from-white via-indigo-200 to-slate-400 bg-clip-text text-transparent uppercase font-mono italic">Real-Time</span><br />
                    <span className="text-indigo-500 text-glow uppercase font-mono">Leaderboards</span>
                </motion.h1>

                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto font-medium leading-relaxed"
                >
                    Designed for <span className="text-white font-bold">Competitive Minds</span>. Track performance, manage rankings, and stay ahead — all in one powerful system.
                </motion.p>

                {user && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10"
                    >
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="group relative flex w-full sm:w-auto items-center justify-center gap-4 px-10 py-5 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl text-white hover:from-indigo-500 hover:to-indigo-700 transition-all duration-300 shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_rgba(79,70,229,0.6)] active:scale-95 border border-indigo-400/30 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                            <Plus className="w-6 h-6 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                            <div className="relative z-10 flex flex-col items-start leading-none text-left">
                                <span className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold mb-1">Get Started</span>
                                <span className="font-black text-xl tracking-wide uppercase">Create New Board</span>
                            </div>
                        </button>
                    </motion.div>
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

            <div className="flex justify-center pt-10">
                <Link
                    to="/boards"
                    className="group relative flex items-center justify-center gap-4 px-10 py-5 bg-gradient-to-r from-indigo-900/40 to-indigo-800/40 backdrop-blur-md rounded-2xl text-slate-300 hover:text-white transition-all duration-300 border border-white/5 hover:border-indigo-500/30 hover:shadow-[0_0_40px_rgba(79,70,229,0.2)] active:scale-95"
                >
                    <LayoutGrid className="w-5 h-5 text-indigo-400 group-hover:rotate-90 transition-transform duration-500" />
                    <div className="flex flex-col items-start leading-none text-left">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 group-hover:text-indigo-300 font-bold mb-1">Discover more</span>
                        <span className="font-black text-lg tracking-wide uppercase">Explore All Boards</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-indigo-500 group-hover:translate-x-2 transition-transform duration-300" />
                </Link>
            </div>

            {/* Why EliteBoards Section */}
            <div className="pt-32 pb-10 border-t border-white/10 mt-20">
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-block px-4 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                        Core Advantages
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-black text-white uppercase font-mono tracking-tight leading-none">
                        Why <span className="text-indigo-500 italic">EliteBoards?</span>
                    </h2>
                    <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
                        Precision engineering meets seamless user experience. Built for those who take performance seriously.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glass p-8 rounded-[2rem] relative overflow-hidden group hover:border-indigo-500/50 transition-all">
                        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                            <Zap className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 uppercase tracking-tighter">Socket Powered</h3>
                        <p className="text-slate-500 leading-relaxed text-sm">
                            Instant updates without refreshes. Experience the thrill of real-time rank changes as they happen.
                        </p>
                    </div>
                    <div className="glass p-8 rounded-[2rem] relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                            <Trophy className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 uppercase tracking-tighter">Smart Ranking</h3>
                        <p className="text-slate-500 leading-relaxed text-sm">
                            Intelligent tie-handling system ensures fair competition. Equal scores share the same podium.
                        </p>
                    </div>
                    <div className="glass p-8 rounded-[2rem] relative overflow-hidden group hover:border-purple-500/50 transition-all">
                        <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                            <Activity className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 uppercase tracking-tighter">Admin Mod</h3>
                        <p className="text-slate-500 leading-relaxed text-sm">
                            Complete moderation control. Ban entries, adjust scores, and manage board visibility with one tap.
                        </p>
                    </div>
                    <div className="glass p-8 rounded-[2rem] relative overflow-hidden group hover:border-blue-500/50 transition-all">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                            <Download className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 uppercase tracking-tighter">Export Ready</h3>
                        <p className="text-slate-500 leading-relaxed text-sm">
                            Download comprehensive CSV or PDF reports of your leaderboards for offline analysis and record-keeping.
                        </p>
                    </div>
                </div>
            </div>

            {/* Tech Power Showcase */}
            <div className="py-24 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
                <div className="text-center mb-12">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4 block">Engineered for Scalability</span>
                    <h3 className="text-2xl font-black text-white uppercase font-mono tracking-widest">Technological <span className="text-indigo-500">Foundation</span></h3>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-12 opacity-40 hover:opacity-100 transition-opacity duration-700 grayscale hover:grayscale-0">
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                            <span className="text-indigo-400 font-black font-mono">M</span>
                        </div>
                        <span className="text-slate-400 font-bold uppercase tracking-tighter group-hover:text-white transition-colors">MongoDB</span>
                    </div>
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                            <span className="text-indigo-400 font-black font-mono">E</span>
                        </div>
                        <span className="text-slate-400 font-bold uppercase tracking-tighter group-hover:text-white transition-colors">Express.js</span>
                    </div>
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                            <span className="text-indigo-400 font-black font-mono">R</span>
                        </div>
                        <span className="text-slate-400 font-bold uppercase tracking-tighter group-hover:text-white transition-colors">React</span>
                    </div>
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                            <span className="text-indigo-400 font-black font-mono">N</span>
                        </div>
                        <span className="text-slate-400 font-bold uppercase tracking-tighter group-hover:text-white transition-colors">Node.js</span>
                    </div>
                    <div className="h-8 w-px bg-white/10 hidden md:block"></div>
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                            <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-slate-400 font-bold uppercase tracking-tighter group-hover:text-white transition-colors">Socket.io</span>
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
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Entry Mode</label>
                                <select
                                    value={entryMode}
                                    onChange={(e) => setEntryMode(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-colors"
                                >
                                    <option value="manual">Manual only</option>
                                    <option value="upload">Upload only</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enabled Fields</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['cgpa', 'sgpa', 'marks'].map((field) => (
                                        <button
                                            key={field}
                                            type="button"
                                            onClick={() => setFields((prev) => ({ ...prev, [field]: !prev[field] }))}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${fields[field] ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-500'}`}
                                        >
                                            {field}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Primary Ranking Field</label>
                                <select
                                    value={ranking.primaryField}
                                    onChange={(e) => setRanking((prev) => ({ ...prev, primaryField: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-colors"
                                >
                                    <option value="cgpa">CGPA</option>
                                    <option value="sgpa">SGPA</option>
                                    <option value="marks">Marks</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Verification Level</label>
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
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-colors"
                                >
                                    <option value="none">No verification</option>
                                    <option value="identity_match">Identity match required</option>
                                    <option value="document_verification">Document verification required</option>
                                    <option value="manual_approval">Manual approval required</option>
                                </select>
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
