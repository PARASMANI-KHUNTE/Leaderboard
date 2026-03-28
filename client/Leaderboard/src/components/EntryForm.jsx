import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { useAuth, useModal } from '../App';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';

const EntryForm = ({ leaderboardId, editingEntry, entries, onCancel, onSuccess }) => {
    const { user } = useAuth();
    const { showAlert, showConfirm } = useModal();
    const [name, setName] = useState(editingEntry?.name || '');
    const [cgpa, setCgpa] = useState(editingEntry?.cgpa || '');
    const [marks, setMarks] = useState(editingEntry?.marks || '');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const parsedCgpa = parseFloat(cgpa);
    const isPromoted = parsedCgpa === 0;

    useEffect(() => {
        if (editingEntry) {
            setName(editingEntry.name);
            setCgpa(editingEntry.cgpa);
            setMarks(editingEntry.marks || '');
        }
    }, [editingEntry]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || cgpa === '' || marks === '') {
            setStatus('error');
            setMessage('Please fill in all fields (Name, CGPA and Marks)');
            return;
        }

        const parsedMarks = parseFloat(marks);
        if (parsedMarks < 0 || parsedMarks > 700) {
            setStatus('error');
            setMessage('Please enter valid marks (0-700)');
            return;
        }

        setStatus('loading');
        try {
            const data = {
                name,
                cgpa: parsedCgpa,
                marks: parsedMarks
            };

            if (editingEntry) {
                await axios.put(
                    `${API_URL}/api/leaderboard/edit/${editingEntry._id}`,
                    data
                );
                setStatus('success');
                setMessage('Entry updated successfully!');
            } else {
                await axios.post(
                    `${API_URL}/api/leaderboard/submit`,
                    { ...data, leaderboardId }
                );
                setStatus('success');
                setMessage('Entry submitted successfully!');
            }
            onSuccess(data);
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'Failed to submit entry');
        }
    };

    if (status === 'success') {
        return (
            <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in">
                <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="text-green-500 w-8 h-8" />
                </div>
                <p className="text-green-400 font-bold">{message}</p>
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-slate-500">Your entry is now live on the leaderboard.</p>
                    <button
                        onClick={() => setStatus('idle')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                    >
                        Make another change?
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-200/80 leading-relaxed">
                    <span className="font-bold text-yellow-500 uppercase">Attention:</span> Please enter valid details. Do not use fake names or CGPA. Persistent fake entries may lead to a ban.
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-colors"
                    required
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CGPA (out of 10)</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    placeholder="e.g. 9.5"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-colors"
                    required
                />
                {parseFloat(cgpa) === 0 && (
                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter animate-pulse">
                        Promoted Student Mode Activated
                    </p>
                )}
            </div>

            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Marks Obtained (Max 700)
                </label>
                <input
                    type="number"
                    step="1"
                    min="0"
                    max="700"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    placeholder="Enter total marks out of 700"
                    className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors text-indigo-100 placeholder:text-indigo-400/50"
                    required
                />
                {isPromoted ? (
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest animate-pulse">
                        Promoted Student Mode Activated
                    </p>
                ) : (
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                        Used as a tie-breaker if CGPAs are identical.
                    </p>
                )}
            </div>

            {status === 'error' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {message}
                </div>
            )}

            <div className="flex gap-4">
                {editingEntry && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-bold text-slate-400"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 cursor-pointer"
                >
                    {status === 'loading' ? (
                        'Processing...'
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            {editingEntry ? 'Update Entry' : 'Submit Entry'}
                        </>
                    )}
                </button>
            </div>

            <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold">
                {editingEntry ? 'You can update your details anytime' : 'Caution: One entry per student'}
            </p>
        </form>
    );
};

export default EntryForm;
