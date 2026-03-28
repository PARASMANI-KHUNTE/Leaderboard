import React, { useState } from 'react';
import { MessageSquare, Send, X, Star } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth, useModal } from '../App';
import axios from 'axios';
import API_URL from '../config';

const FeedbackForm = () => {
    const { user } = useAuth();
    const { showAlert } = useModal();
    const [isOpen, setIsOpen] = useState(false);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return showAlert('Login Required', 'Please login to send feedback');
        if (!text.trim()) return;

        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/feedback/submit`, { text });
            setText('');
            setIsOpen(false);
            showAlert('Success', 'Feedback sent! Appreciation incoming.');
        } catch {
            showAlert('Error', 'Failed to send feedback');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-[200]">
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-2xl shadow-indigo-600/20 transition-all active:scale-95 group"
            >
                <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-black uppercase tracking-widest text-[10px]">Feedback</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-lg glass p-1 rounded-3xl relative overflow-hidden shadow-2xl shadow-indigo-500/20"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-8 space-y-8 bg-slate-900/50 rounded-[22px]">
                                <div className="absolute top-0 right-0 p-4">
                                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all"><X className="w-5 h-5 text-slate-500" /></button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/40">
                                            <Star className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black uppercase font-mono tracking-tight text-white leading-tight">Elite Feedback</h2>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Shape the future of this platform</p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-3">
                                        <textarea
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            placeholder="What's on your mind? Bug reports, feature requests, or just a generic 'Hello'..."
                                            rows="5"
                                            required
                                            className="w-full bg-slate-950/80 border border-white/5 rounded-2xl px-6 py-5 outline-none focus:border-indigo-500/50 transition-all font-mono text-xs leading-relaxed text-slate-300 resize-none"
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {loading ? 'Committing...' : (
                                            <>
                                                <Send className="w-3 h-3" />
                                                Transmit Feedback
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="flex items-center justify-center gap-2 pt-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/30"></div>
                                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest text-center">
                                        End-to-end encrypted with system integrity
                                    </p>
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/30"></div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FeedbackForm;
