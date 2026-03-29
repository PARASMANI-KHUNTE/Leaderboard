import React, { useEffect } from 'react';
import { Medal, Crown, Edit2, Trash2, Heart, ThumbsDown, MessageSquare, Flag, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth, useModal } from '../App';
import axios from 'axios';
import API_URL from '../config';
import confetti from 'canvas-confetti';

const METRIC_LABELS = {
    cgpa: 'CGPA',
    sgpa: 'SGPA',
    marks: 'Marks',
    rankingScore: 'Score',
};

const ProfileImage = ({ src, alt, size = "w-10 h-10" }) => {
    const [error, setError] = React.useState(false);
    if (!src || error) {
        return (
            <div className={`${size} rounded-full border-2 border-white/10 bg-white/5 flex items-center justify-center text-slate-500`}>
                <User className={size === "w-10 h-10" ? "w-6 h-6" : "w-4 h-4"} />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            className={`${size} rounded-full border-2 border-white/10 shadow-lg object-cover`}
            onError={() => setError(true)}
            referrerPolicy="no-referrer"
        />
    );
};

const LeaderboardTable = ({ entries, loading, leaderboard, onEdit, onDelete, leaderboardCreatorId, onOpenReport }) => {
    const { user } = useAuth();
    const { showAlert } = useModal();
    const primaryField = leaderboard?.ranking?.primaryField || 'cgpa';

    useEffect(() => {
        if (entries.length > 0 && !loading) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
            const randomInRange = (min, max) => Math.random() * (max - min) + min;

            const interval = setInterval(function () {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
            return () => clearInterval(interval);
        }
    }, [entries.length, loading]);

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-500 animate-pulse font-mono tracking-widest">
                LOADING_DATA...
            </div>
        );
    }

    const handleReact = async (id, e) => {
        e.stopPropagation();
        if (!user) return showAlert('Login Required', 'Please login to react');
        
        // Optimistic Update
        const targetEntry = entries.find(entry => entry._id === id);
        if (targetEntry) {
            const hasLiked = (targetEntry.likedBy || []).some(uId => String(uId) === String(user.id));
            const hasDisliked = (targetEntry.dislikedBy || []).some(uId => String(uId) === String(user.id));
            
            // Replicate server mutual exclusion logic locally
            const simulatedLikedBy = hasLiked
                ? (targetEntry.likedBy || []).filter(uId => String(uId) !== String(user.id))
                : [...(targetEntry.likedBy || []), user.id];
            const simulatedDislikedBy = hasDisliked
                ? (targetEntry.dislikedBy || []).filter(uId => String(uId) !== String(user.id))
                : [...(targetEntry.dislikedBy || [])];
            
            // We temporarily mutate just the local prop to make it *feel* instant. 
            // In a strict React app with parent state, we'd fire an `onUpdate` prop.
            // Since `LeaderboardView` listens to the socket, the true state will arrive momentarily.
            targetEntry.likedBy = simulatedLikedBy;
            targetEntry.dislikedBy = simulatedDislikedBy;
        }

        try {
            await axios.post(`${API_URL}/api/leaderboard/react/${id}`, {});
        } catch {
            console.error('Failed to react');
        }
    };

    const handleDislike = async (id, e) => {
        e.stopPropagation();
        if (!user) return showAlert('Login Required', 'Please login to react');
        
        const targetEntry = entries.find(entry => entry._id === id);
        if (targetEntry) {
            const hasLiked = (targetEntry.likedBy || []).some(uId => String(uId) === String(user.id));
            const hasDisliked = (targetEntry.dislikedBy || []).some(uId => String(uId) === String(user.id));
            
            const simulatedLikedBy = hasLiked
                ? (targetEntry.likedBy || []).filter(uId => String(uId) !== String(user.id))
                : [...(targetEntry.likedBy || [])];
            const simulatedDislikedBy = hasDisliked
                ? (targetEntry.dislikedBy || []).filter(uId => String(uId) !== String(user.id))
                : [...(targetEntry.dislikedBy || []), user.id];
            
            targetEntry.likedBy = simulatedLikedBy;
            targetEntry.dislikedBy = simulatedDislikedBy;
        }

        try {
            await axios.post(`${API_URL}/api/leaderboard/dislike/${id}`, {});
        } catch {
            console.error('Failed to dislike');
        }
    };

    return (
        <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rank</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{METRIC_LABELS[primaryField] || 'Score'}</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Social</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry, index) => {
                        // Visual tie grouping only; global rank comes from backend (`entry.rank`).
                        let isTie = false;
                        if (index > 0) {
                            const prev = entries[index - 1];
                            if ((entry[primaryField] ?? entry.cgpa) === (prev[primaryField] ?? prev.cgpa) && entry.marks === prev.marks) {
                                isTie = true;
                            }
                        }

                        // Determine if next is also a tie (for visual grouping)
                        const isTieWithNext = index < entries.length - 1 &&
                            (entry[primaryField] ?? entry.cgpa) === (entries[index + 1][primaryField] ?? entries[index + 1].cgpa) &&
                            entry.marks === entries[index + 1].marks;

                        const rowRank = typeof entry.rank === 'number' ? entry.rank : null;

                        return (
                            <motion.tr
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={entry._id}
                                className={`border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer 
                                    ${rowRank === 1 ? 'bg-indigo-500/10' : ''} 
                                    ${isTie || isTieWithNext ? 'bg-white/[0.02]' : ''}`}
                            >
                                <td className="px-6 py-4">
                                    <div className="relative">
                                        {rowRank === 1 ? (
                                            <div className="relative">
                                                <Crown className="w-8 h-8 text-yellow-400 animate-bounce" />
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                                            </div>
                                        ) : rowRank === 2 ? (
                                            <Medal className="w-6 h-6 text-slate-300" />
                                        ) : rowRank === 3 ? (
                                            <Medal className="w-6 h-6 text-amber-600" />
                                        ) : (
                                            <span className="text-slate-500 font-mono">
                                                {rowRank !== null ? `#${rowRank}` : '#--'}
                                            </span>
                                        )}
                                        {(isTie || isTieWithNext) && (
                                            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-indigo-500/40 rounded-full"></div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <ProfileImage src={entry.userPicture} alt={entry.name} />
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold uppercase tracking-tight ${rowRank === 1 ? 'text-yellow-400 text-lg' : 'text-slate-200'}`}>
                                                    {entry.name}
                                                </span>
                                                {entry.useMarks ? (
                                                    <span className="text-[8px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded uppercase tracking-tighter">PROMOTED</span>
                                                ) : (
                                                    <span className="text-[8px] font-black bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded uppercase tracking-tighter">PASS</span>
                                                )}
                                                {entry.verificationStatus === 'verified' && (
                                                    <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase tracking-tighter">VERIFIED</span>
                                                )}
                                                {isTie && (
                                                    <span className="text-[8px] font-black bg-white/10 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">TIED</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Joined {new Date(entry.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        {entry.useMarks ? (
                                            <>
                                                <span className={`font-mono font-black text-lg ${index === 0 ? 'text-yellow-400' : 'text-indigo-400'}`}>
                                                    {entry.marks}
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                                                    Marks (700)
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className={`font-mono font-black text-lg ${index === 0 ? 'text-yellow-400' : 'text-indigo-400'}`}>
                                                    {typeof entry[primaryField] === 'number'
                                                        ? entry[primaryField].toFixed(primaryField === 'marks' ? 0 : 2)
                                                        : (entry.cgpa ?? 0).toFixed(2)}
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                                                    {METRIC_LABELS[primaryField] || 'Score'}{entry.marks ? ` | ${entry.marks} Marks` : ''}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <button onClick={(e) => handleReact(entry._id, e)} className="flex items-center gap-1.5 group/heart">
                                            <Heart className={`w-4 h-4 transition-all ${ (entry.likedBy || []).some(uId => String(uId) === String(user?.id)) ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-500 group-hover/heart:text-red-400'}`} />
                                            <span className="text-xs font-bold text-slate-500 font-mono">{entry.likedBy?.length || 0}</span>
                                        </button>
                                        <button onClick={(e) => handleDislike(entry._id, e)} className="flex items-center gap-1.5 group/dislike">
                                            <ThumbsDown className={`w-4 h-4 transition-all ${ (entry.dislikedBy || []).some(uId => String(uId) === String(user?.id)) ? 'fill-indigo-500 text-indigo-500 scale-110' : 'text-slate-500 group-hover/dislike:text-indigo-400'}`} />
                                            <span className="text-xs font-bold text-slate-500 font-mono">{entry.dislikedBy?.length || 0}</span>
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {(user && (String(user.id) === String(entry.userId) || String(user.id) === String(leaderboardCreatorId))) ? (
                                            <>
                                                {String(user.id) === String(entry.userId) && (
                                                    <button onClick={(e) => { e.stopPropagation(); onEdit(entry); }} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all"><Edit2 className="w-4 h-4" /></button>
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); onDelete(entry._id); }} className="p-2 bg-red-500/10 rounded-lg text-red-500 hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /></button>
                                            </>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); onOpenReport(entry._id); }} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-all" title="Report Fake Entry">
                                                <Flag className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default LeaderboardTable;
