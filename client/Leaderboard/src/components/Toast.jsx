import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageSquare, Bell, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const playSound = useCallback(() => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.4;
        audio.play().catch(e => console.log('Sound blocked by browser policy'));
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        playSound();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    }, [playSound, removeToast]);

    const icons = {
        heart: <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />,
        comment: <MessageSquare className="w-4 h-4 text-indigo-400" />,
        info: <Bell className="w-4 h-4 text-white" />
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed top-24 right-8 z-[2000] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            className="pointer-events-auto flex items-center gap-4 bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl min-w-[300px] max-w-sm glass"
                        >
                            <div className="p-2.5 bg-white/5 rounded-xl shadow-inner">
                                {icons[toast.type] || icons.info}
                            </div>
                            <p className="text-sm font-medium text-slate-200 flex-1">{toast.message}</p>
                            <button onClick={() => removeToast(toast.id)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
