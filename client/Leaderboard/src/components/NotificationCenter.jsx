import React, { useState, useEffect } from 'react';
import { Bell, Heart, MessageSquare, Flag, X, Trash2, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useToast } from './Toast';
import API_URL from '../config';

const NotificationCenter = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        const socket = io(API_URL, {
            withCredentials: true,
        });

        if (user.isAdmin) {
            socket.emit('joinAdmin');
        }

        const handleGlobalNotif = (notif) => {
            const newNotif = {
                id: Date.now(),
                ...notif,
                timestamp: new Date(),
            };
            setNotifications(prev => [newNotif, ...prev].slice(0, 20));
            setUnreadCount(prev => prev + 1);
        };

        socket.on('globalNotification', handleGlobalNotif);

        return () => socket.disconnect();
    }, [user]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) setUnreadCount(0);
    };

    const clearAll = () => {
        setNotifications([]);
        setUnreadCount(0);
    };

    if (!user) return null;

    const icons = {
        heart: <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />,
        'thumbs-down': <ThumbsDown className="w-4 h-4 text-indigo-500 fill-indigo-500" />,
        comment: <MessageSquare className="w-4 h-4 text-indigo-400" />,
        report: <Flag className="w-4 h-4 text-red-500" />,
        info: <Bell className="w-4 h-4 text-white" />
    };

    return (
        <div className="relative">
            <button
                onClick={handleToggle}
                className="relative p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-90 group"
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-indigo-400 animate-pulse' : 'text-slate-400 group-hover:text-white'}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-[10px] font-black flex items-center justify-center rounded-full border-2 border-slate-950 text-white shadow-lg shadow-indigo-500/20">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[1000]" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-3 w-80 bg-slate-950/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-[1001] overflow-hidden"
                        >
                            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/2">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Notifications</h3>
                                {notifications.length > 0 && (
                                    <button onClick={clearAll} className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1">
                                        <Trash2 className="w-3 h-3" /> Clear
                                    </button>
                                )}
                            </div>

                            <div className="max-h-[400px] overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map((notif) => (
                                        <button
                                            key={notif.id}
                                            onClick={() => {
                                                if (notif.target) navigate(notif.target);
                                                setIsOpen(false);
                                            }}
                                            className="w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-colors flex gap-4 items-start group/item"
                                        >
                                            <div className="p-2.5 bg-white/5 rounded-xl group-hover/item:bg-white/10 transition-colors shrink-0">
                                                {icons[notif.type] || icons.info}
                                            </div>
                                            <div className="flex-1 space-y-1.5 overflow-hidden">
                                                <p className="text-xs text-slate-200 font-bold leading-relaxed break-words">
                                                    {notif.message}
                                                </p>
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                                                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-12 text-center space-y-3 opacity-20">
                                        <Bell className="w-12 h-12 mx-auto" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">All caught up!</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationCenter;
