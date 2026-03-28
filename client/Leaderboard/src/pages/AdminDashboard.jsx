import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth, useModal } from '../App';
import axios from 'axios';
import API_URL from '../config';
import { Shield, Flag, UserX, UserCheck, Trash2, CheckCircle, Clock, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const ProfileImage = ({ src, alt, size = "w-12 h-12" }) => {
    const [error, setError] = useState(false);
    if (!src || error) {
        return (
            <div className={`${size} rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-500`}>
                <User className={size === "w-12 h-12" ? "w-6 h-6" : "w-4 h-4"} />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            className={`${size} rounded-xl border border-white/10 object-cover`}
            onError={() => setError(true)}
            referrerPolicy="no-referrer"
        />
    );
};

const AdminDashboard = () => {
    const { user } = useAuth();
    const { showAlert, showConfirm } = useModal();
    const [searchParams] = useSearchParams();
    const [reports, setReports] = useState([]);
    const [feedback, setFeedback] = useState([]);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'reports');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    const fetchAdminData = useCallback(async () => {
        try {
            const [repRes, feedRes, userRes] = await Promise.all([
                axios.get(`${API_URL}/api/admin/reports`),
                axios.get(`${API_URL}/api/admin/feedback`),
                axios.get(`${API_URL}/api/admin/users${searchQuery ? `?search=${searchQuery}` : ''}`)
            ]);
            setReports(repRes.data);
            setFeedback(feedRes.data);
            setUsers(userRes.data);
        } catch (err) {
            console.error('Failed to fetch admin data', err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        if (user?.isAdmin) fetchAdminData();
    }, [user, fetchAdminData]);

    const handleResolve = async (reportId, action) => {
        try {
            await axios.post(`${API_URL}/api/admin/resolve-report/${reportId}`, { action });
            setReports(prev => prev.filter(r => r._id !== reportId));
            showAlert('Status', 'Action completed');
        } catch {
            showAlert('Error', 'Failed to resolve report');
        }
    };

    const handleToggleBan = async (userId) => {
        try {
            const res = await axios.post(`${API_URL}/api/admin/toggle-ban/${userId}`, {});
            showAlert('Success', res.data.message);
            fetchAdminData();
        } catch {
            showAlert('Error', 'Failed to toggle ban');
        }
    };

    const handleToggleRead = async (feedbackId) => {
        try {
            const res = await axios.patch(`${API_URL}/api/admin/feedback/${feedbackId}/toggle-read`, {});
            setFeedback(prev => prev.map(f => f._id === feedbackId ? res.data : f));
        } catch {
            showAlert('Error', 'Failed to update feedback status');
        }
    };

    const handleDeleteFeedback = async (feedbackId) => {
        const ok = await showConfirm('Delete Feedback', 'Are you sure you want to delete this feedback?');
        if (!ok) return;

        try {
            await axios.delete(`${API_URL}/api/admin/feedback/${feedbackId}`);
            setFeedback(prev => prev.filter(f => f._id !== feedbackId));
            showAlert('Success', 'Feedback deleted');
        } catch {
            showAlert('Error', 'Failed to delete feedback');
        }
    };

    if (!user?.isAdmin) return <div className="text-center py-20 font-mono">ACCESS_DENIED</div>;
    if (loading && users.length === 0) return <div className="text-center py-20 font-mono animate-pulse">LOADING_ADMIN_PANEL...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase font-mono tracking-tight text-white">Admin Control</h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.3em]">System Management Hub</p>
                    </div>
                </div>

                {activeTab === 'users' && (
                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Search students by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50 transition-all font-mono"
                        />
                    </div>
                )}
            </div>

            <div className="flex gap-4 border-b border-white/5 pb-1 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-8 py-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 whitespace-nowrap ${activeTab === 'reports' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    Reports ({reports.length})
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-8 py-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 whitespace-nowrap ${activeTab === 'users' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    Users ({users.length})
                </button>
                <button
                    onClick={() => setActiveTab('feedback')}
                    className={`px-8 py-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 whitespace-nowrap ${activeTab === 'feedback' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    Feedback ({feedback.length})
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'reports' ? (
                    <motion.div
                        key="reports"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 gap-6"
                    >
                        {reports.length === 0 ? (
                            <div className="glass p-12 text-center text-slate-500 italic font-mono uppercase tracking-widest">No pending reports. All clear!</div>
                        ) : (
                            reports.map(report => (
                                <div key={report._id} className="glass p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black rounded uppercase tracking-widest">{report.reason}</span>
                                            <span className="text-xs text-slate-500 flex items-center gap-1 font-bold">
                                                <Clock className="w-3 h-3" />
                                                {new Date(report.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white uppercase">{report.entryId?.name || 'Deleted Entry'}</h3>
                                            <p className="text-xs text-slate-500">Reported by: <span className="text-indigo-400 font-bold">{report.reporterId?.displayName}</span></p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleResolve(report._id, 'delete')}
                                            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Delete Entry
                                        </button>
                                        <button
                                            onClick={() => handleResolve(report._id, 'ignore')}
                                            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                                        >
                                            Ignore
                                        </button>
                                        {report.entryId?.userId && (
                                            <button
                                                onClick={() => handleToggleBan(report.entryId.userId)}
                                                className="px-6 py-3 bg-slate-950 border border-white/10 hover:border-red-500/50 text-slate-500 hover:text-red-400 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                                            >
                                                <UserX className="w-3 h-3" />
                                                Ban User
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </motion.div>
                ) : activeTab === 'users' ? (
                    <motion.div
                        key="users"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 gap-4"
                    >
                        {users.map(u => (
                            <div key={u._id} className={`glass p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 ${u.isBanned ? 'border-red-500/30 bg-red-500/5' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <ProfileImage src={u.profilePicture} alt="" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-white uppercase">{u.displayName}</h3>
                                            {u.isAdmin && <span className="text-[10px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded tracking-tighter">ADMIN</span>}
                                        </div>
                                        <p className="text-xs text-slate-500">{u.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-center">
                                        <div className="flex items-center gap-1.5 text-red-500 font-black text-sm">
                                            <Flag className="w-3 h-3" />
                                            {u.reportCount || 0}
                                        </div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Reports</p>
                                    </div>

                                    {!u.isAdmin && (
                                        <button
                                            onClick={() => handleToggleBan(u._id)}
                                            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center gap-2 ${u.isBanned
                                                ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
                                                : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'}`}
                                        >
                                            {u.isBanned ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                                            {u.isBanned ? 'Unban User' : 'Ban User'}
                                        </button>
                                    )}

                                    {!u.isAdmin && (
                                        <button
                                            onClick={async () => {
                                                const ok = await showConfirm('Delete User', `Are you sure you want to PERMANENTLY delete ${u.displayName}? This will purge all their entries, likes, and feedback.`);
                                                if (!ok) return;
                                                try {
                                                    await axios.delete(`${API_URL}/api/admin/user/${u._id}`);
                                                    setUsers(prev => prev.filter(user => user._id !== u._id));
                                                    showAlert('Success', 'User and all data purged.');
                                                } catch {
                                                    showAlert('Error', 'Failed to delete user');
                                                }
                                            }}
                                            className="p-2.5 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500/20 transition-all border border-red-500/10"
                                            title="Delete User & Activity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="feedback"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        {feedback.length === 0 ? (
                            <div className="glass p-12 text-center text-slate-500 italic col-span-2 font-mono uppercase tracking-widest">No feedback received.</div>
                        ) : (
                            feedback.map(item => (
                                <div key={item._id} className={`glass p-8 space-y-4 transition-all ${item.isRead ? 'opacity-60 bg-white/0' : 'bg-white/2 border-indigo-500/20'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${item.isRead ? 'bg-slate-700' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'}`}></div>
                                            <span className="text-xs font-black text-white hover:text-indigo-400 transition-colors uppercase tracking-widest cursor-default">{item.userName || 'Student'}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-slate-600 font-bold">{new Date(item.createdAt).toLocaleDateString()}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleToggleRead(item._id)}
                                                    className={`p-2 rounded-lg transition-all ${item.isRead ? 'text-slate-600 hover:text-indigo-400' : 'text-indigo-500 hover:bg-indigo-500/10'}`}
                                                    title={item.isRead ? 'Mark as Unread' : 'Mark as Read'}
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteFeedback(item._id)}
                                                    className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Delete Feedback"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed italic">"{item.text}"</p>
                                </div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
