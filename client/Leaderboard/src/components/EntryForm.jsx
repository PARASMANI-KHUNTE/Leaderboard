import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { Send, CheckCircle2, AlertCircle, Upload, FileText, ShieldCheck, Check, X, Clock3, ChevronDown, LoaderCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const EMPTY = { fullName: null, studentId: null, enrollmentNumber: null, rollNumber: null, universityName: null, programme: null, session: null, sgpa: null, cgpa: null, marks: null, qrUrl: null, confidence: 0, warnings: [] };

function LoadingBar({ label }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-black text-indigo-200">
                <span>{label}</span>
                <LoaderCircle className="w-4 h-4 animate-spin" />
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-900/80">
                <motion.div
                    className="h-full w-1/2 bg-gradient-to-r from-indigo-500 via-indigo-300 to-cyan-300"
                    initial={{ x: '-100%' }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
                />
            </div>
        </div>
    );
}

function PreviewCard({ title, extracted }) {
    const [open, setOpen] = useState(false);
    const rows = [
        ['Name', extracted.fullName], ['Student ID', extracted.studentId], ['Enrollment', extracted.enrollmentNumber],
        ['Roll No', extracted.rollNumber], ['University', extracted.universityName], ['Programme', extracted.programme],
        ['Session', extracted.session], ['SGPA', extracted.sgpa], ['CGPA', extracted.cgpa], ['Marks', extracted.marks], ['QR Link', extracted.qrUrl],
    ];

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3">
                <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-200">{title}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Confidence {Math.round((extracted.confidence || 0) * 100)}%</p>
                    <p className="text-xs text-slate-300 mt-2">{extracted.fullName || extracted.universityName || 'Tap to inspect extracted fields'}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/10">
                        <div className="p-4 space-y-2 text-xs">
                            {rows.map(([label, value]) => (
                                <div key={label} className="flex items-start justify-between gap-4">
                                    <span className="text-slate-500 uppercase tracking-widest font-bold">{label}</span>
                                    <span className="text-right text-slate-200 max-w-[60%] break-words">{value ?? 'Not detected'}</span>
                                </div>
                            ))}
                            {extracted.warnings?.length > 0 && (
                                <div className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-yellow-100/80">
                                    <p className="text-[10px] uppercase tracking-widest font-black text-yellow-300">Warnings</p>
                                    <p className="mt-1">{extracted.warnings.join(' ')}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function CompareBadge({ label, value }) {
    const style = value?.status === 'matched'
        ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
        : value?.status === 'mismatched'
            ? 'text-red-300 border-red-500/30 bg-red-500/10'
            : value?.status === 'not_comparable'
                ? 'text-slate-300 border-white/10 bg-white/5'
                : 'text-yellow-200 border-yellow-500/30 bg-yellow-500/10';
    const icon = value?.status === 'matched' ? <Check className="w-3.5 h-3.5" /> : value?.status === 'mismatched' ? <X className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />;

    return (
        <div className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${style}`}>
            <span className="font-bold uppercase tracking-widest">{label}</span>
            <span className="flex items-center gap-2 capitalize">{icon}{String(value?.status || 'missing').replace('_', ' ')}</span>
        </div>
    );
}

const EntryForm = ({ leaderboard, editingEntry, onCancel, onSuccess }) => {
    const [name, setName] = useState(editingEntry?.name || '');
    const [cgpa, setCgpa] = useState(editingEntry?.cgpa ?? '');
    const [sgpa, setSgpa] = useState(editingEntry?.sgpa ?? '');
    const [marks, setMarks] = useState(editingEntry?.marks ?? '');
    const [method, setMethod] = useState(leaderboard?.entryMode === 'hybrid' ? 'upload' : leaderboard?.entryMode || 'manual');
    const [idFile, setIdFile] = useState(null);
    const [gradeFile, setGradeFile] = useState(null);
    const [idData, setIdData] = useState(EMPTY);
    const [gradeData, setGradeData] = useState(EMPTY);
    const [idState, setIdState] = useState('idle');
    const [gradeState, setGradeState] = useState('idle');
    const [compareState, setCompareState] = useState('idle');
    const [comparison, setComparison] = useState(null);
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    const enabledFields = leaderboard?.fields || { cgpa: true, sgpa: false, marks: true };
    const uploadMode = method === 'upload';
    const submitEnabled = uploadMode ? comparison?.status === 'accepted' : true;

    const resetUpload = () => {
        setIdData(EMPTY); setGradeData(EMPTY); setIdState('idle'); setGradeState('idle'); setCompareState('idle'); setComparison(null); setMessage(''); setStatus('idle');
    };

    const extract = async (file, endpoint, setPhase, setData) => {
        if (!file) return;
        setPhase('loading');
        setCompareState('idle');
        setComparison(null);
        setStatus('loading');
        setMessage('Extracting information...');
        try {
            const formData = new FormData();
            formData.append(endpoint.includes('id-card') ? 'idCard' : 'gradeCard', file);
            const res = await axios.post(`${API_URL}/api/verifications/${endpoint}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setData(res.data.extracted || EMPTY);
            setPhase('done');
            setStatus('idle');
            setMessage((res.data.extracted?.warnings || []).join(' ') || 'Information extracted successfully.');
        } catch (err) {
            setPhase('error');
            setStatus('error');
            setMessage(err.response?.data?.message || err.message || 'Extraction failed');
        }
    };

    useEffect(() => {
        if (uploadMode && idFile) extract(idFile, 'extract-id-card', setIdState, setIdData);
    }, [idFile, uploadMode]);

    useEffect(() => {
        if (uploadMode && gradeFile) extract(gradeFile, 'extract-grade-card', setGradeState, setGradeData);
    }, [gradeFile, uploadMode]);

    useEffect(() => {
        if (!uploadMode || idState !== 'done' || gradeState !== 'done') return;
        if (!idData.fullName || !gradeData.fullName) return;
        let cancelled = false;
        (async () => {
            try {
                setCompareState('loading');
                setStatus('loading');
                setMessage('Comparing extracted details...');
                const res = await axios.post(`${API_URL}/api/verifications/compare`, { idCard: idData, gradeCard: gradeData });
                if (cancelled) return;
                setComparison(res.data.comparison);
                setCompareState('done');
                setStatus('idle');
                setMessage(res.data.comparison?.status === 'accepted' ? 'Details matched. Submit is now enabled.' : res.data.comparison?.status === 'needs_review' ? 'Partial match found. This may still need review.' : 'Documents do not match strongly enough yet.');
            } catch (err) {
                if (cancelled) return;
                setCompareState('error');
                setStatus('error');
                setMessage(err.response?.data?.message || err.message || 'Failed to compare documents');
            }
        })();
        return () => { cancelled = true; };
    }, [uploadMode, idState, gradeState, idData, gradeData]);

    const submitManual = async () => {
        const payload = { name, leaderboardId: leaderboard._id };
        if (enabledFields.cgpa) payload.cgpa = parseFloat(cgpa);
        if (enabledFields.sgpa) payload.sgpa = parseFloat(sgpa);
        if (enabledFields.marks) payload.marks = parseFloat(marks);
        if (editingEntry) await axios.put(`${API_URL}/api/leaderboard/edit/${editingEntry._id}`, payload);
        else await axios.post(`${API_URL}/api/leaderboard/submit`, payload);
        onSuccess({ type: 'manual', status: 'accepted', payload, reasons: [] });
        setStatus('success');
        setMessage('Entry submitted successfully!');
    };

    const submitVerified = async () => {
        if (!submitEnabled) throw new Error('Please wait for both extractions and a successful comparison before submitting.');
        setStatus('loading');
        setMessage('Submitting verified entry...');
        const formData = new FormData();
        formData.append('leaderboardId', leaderboard._id);
        formData.append('idCard', idFile);
        formData.append('gradeCard', gradeFile);
        const res = await axios.post(`${API_URL}/api/verifications/submit-final`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const actualStatus = res.data?.submission?.status || (res.data?.entry ? 'accepted' : 'needs_review');
        if (!res.data?.entry || res.data?.uploaded !== true) {
            onSuccess({
                type: 'upload',
                status: actualStatus,
                payload: res.data,
                reasons: [
                    ...(res.data?.submission?.comparison?.acceptedBecause || []),
                    ...(res.data?.submission?.comparison?.rejectedBecause || []),
                ],
            });
            throw new Error(res.data?.message || 'Verification did not create an entry yet.');
        }
        onSuccess({ type: 'upload', status: actualStatus, payload: res.data, reasons: res.data?.submission?.comparison?.acceptedBecause || [] });
        setStatus('success');
        setMessage('Documents verified and entry submitted successfully!');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (uploadMode) await submitVerified();
            else await submitManual();
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.message || err.message || 'Failed to submit entry');
        }
    };

    if (status === 'success') {
        return (
            <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center"><CheckCircle2 className="text-green-500 w-8 h-8" /></div>
                <p className="text-green-400 font-bold">{message}</p>
                <button onClick={() => { resetUpload(); setStatus('idle'); }} className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline">Try another submission</button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {leaderboard?.entryMode === 'hybrid' && !editingEntry && (
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
                    <button type="button" onClick={() => { setMethod('upload'); resetUpload(); }} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${method === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Upload Docs</button>
                    <button type="button" onClick={() => { setMethod('manual'); resetUpload(); }} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${method === 'manual' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Manual Entry</button>
                </div>
            )}

            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-200/80 leading-relaxed"><span className="font-bold text-yellow-500 uppercase">Attention:</span> {uploadMode ? 'Extraction starts automatically when you choose a file. Preview appears only after extraction finishes.' : 'Please enter valid details. Persistent fake entries may lead to a ban.'}</p>
            </div>

            {uploadMode ? (
                <>
                    <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-indigo-100/80 leading-relaxed">Upload both documents. We extract, compare, and enable submit automatically when the match is strong.</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">University ID Card</label>
                        <label className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-500/40">
                            <Upload className="w-4 h-4 text-indigo-400" />
                            <span className="text-sm text-slate-300">{idFile?.name || 'Choose ID card image or PDF'}</span>
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { setIdFile(e.target.files?.[0] || null); setIdData(EMPTY); setIdState('idle'); setComparison(null); setCompareState('idle'); }} />
                        </label>
                        {idState === 'loading' && <LoadingBar label="Extracting ID card information" />}
                        {idState === 'done' && <PreviewCard title="ID Card Extracted" extracted={idData} />}
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Grade Card / Marksheet</label>
                        <label className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-500/40">
                            <FileText className="w-4 h-4 text-indigo-400" />
                            <span className="text-sm text-slate-300">{gradeFile?.name || 'Choose grade card image or PDF'}</span>
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { setGradeFile(e.target.files?.[0] || null); setGradeData(EMPTY); setGradeState('idle'); setComparison(null); setCompareState('idle'); }} />
                        </label>
                        {gradeState === 'loading' && <LoadingBar label="Extracting grade card information" />}
                        {gradeState === 'done' && <PreviewCard title="Grade Card Extracted" extracted={gradeData} />}
                    </div>

                    {(compareState === 'loading' || comparison) && (
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-200">Comparison Result</p>
                                {comparison && <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${comparison.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-300' : comparison.status === 'needs_review' ? 'bg-yellow-500/20 text-yellow-200' : 'bg-red-500/20 text-red-300'}`}>{comparison.status.replace('_', ' ')}</span>}
                            </div>
                            {compareState === 'loading' && <LoadingBar label="Comparing extracted details" />}
                            {comparison && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <CompareBadge label="Name" value={comparison.fields?.name} />
                                        <CompareBadge label="University" value={comparison.fields?.university} />
                                        <CompareBadge label="Programme" value={comparison.fields?.programme} />
                                        <CompareBadge label="Session" value={comparison.fields?.session} />
                                        <CompareBadge label="Enrollment" value={comparison.fields?.enrollment} />
                                        <CompareBadge label="Roll Number" value={comparison.fields?.rollNumber} />
                                        <CompareBadge label="Student ID" value={comparison.fields?.studentId} />
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-300">
                                        <p className="font-bold uppercase tracking-widest text-slate-400 mb-2">Why this result happened</p>
                                        <p>{[...(comparison.acceptedBecause || []), ...(comparison.rejectedBecause || [])].join(' ') || 'No detailed reasons available.'}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50" required />
                    </div>
                    {enabledFields.cgpa && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CGPA (out of 10)</label>
                            <input type="number" step="0.01" min="0" max="10" value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="e.g. 9.5" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50" required />
                            {parseFloat(cgpa) === 0 && <p className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter animate-pulse">Promoted Student Mode Activated</p>}
                        </div>
                    )}
                    {enabledFields.sgpa && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">SGPA (out of 10)</label>
                            <input type="number" step="0.01" min="0" max="10" value={sgpa} onChange={(e) => setSgpa(e.target.value)} placeholder="e.g. 8.6" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50" required />
                        </div>
                    )}
                    {enabledFields.marks && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Marks Obtained (Max 700)</label>
                            <input type="number" step="1" min="0" max="700" value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="Enter total marks out of 700" className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-indigo-100 placeholder:text-indigo-400/50" required />
                            {isPromoted ? <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest animate-pulse">Promoted Student Mode Activated</p> : <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Used as a tie-breaker if ranking metrics are identical.</p>}
                        </div>
                    )}
                </>
            )}

            {message && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${status === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : status === 'loading' ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-200' : 'bg-white/5 border border-white/10 text-slate-300'}`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{message}</span>
                </div>
            )}

            <div className="flex gap-4">
                {editingEntry && <button type="button" onClick={onCancel} className="flex-1 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 font-bold text-slate-400">Cancel</button>}
                <button type="submit" disabled={status === 'loading' || (uploadMode && !submitEnabled)} className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20">
                    {status === 'loading' ? <><LoaderCircle className="w-4 h-4 animate-spin" />Working...</> : <><Send className="w-4 h-4" />{editingEntry ? 'Update Entry' : uploadMode ? 'Submit Verified Entry' : 'Submit Entry'}</>}
                </button>
            </div>

            <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold">
                {editingEntry ? 'You can update your details anytime' : uploadMode ? (submitEnabled ? 'Everything matched. You can submit now.' : 'Submit unlocks automatically after both documents are extracted and matched.') : 'Caution: One entry per student'}
            </p>
        </form>
    );
};

export default EntryForm;
