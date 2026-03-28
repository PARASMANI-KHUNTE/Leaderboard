import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, HelpCircle, X } from 'lucide-react';

const CustomModal = ({ isOpen, type = 'alert', title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    const icons = {
        alert: <AlertCircle className="w-12 h-12 text-indigo-500" />,
        confirm: <HelpCircle className="w-12 h-12 text-indigo-500" />,
        success: <CheckCircle2 className="w-12 h-12 text-green-500" />,
        error: <AlertCircle className="w-12 h-12 text-red-500" />
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={type === 'alert' ? onConfirm : onCancel}
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm glass p-8 text-center space-y-6 shadow-2xl shadow-indigo-500/10 border border-white/10"
                    >
                        <div className="flex justify-center">
                            <div className="p-4 bg-white/5 rounded-2xl">
                                {icons[type] || icons.alert}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-white uppercase font-mono tracking-tight">{title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
                        </div>

                        <div className="flex gap-3">
                            {type === 'confirm' && (
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 font-bold text-xs uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={onConfirm}
                                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                            >
                                {type === 'confirm' ? 'Confirm' : 'OK'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CustomModal;
