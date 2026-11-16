import React from 'react';
import { Link } from 'react-router-dom';
import { 
    ShieldCheck, 
    Zap, 
    Smartphone, 
    Globe, 
    Trophy, 
    Activity, 
    Download, 
    Github, 
    Linkedin, 
    Mail, 
    BookOpen,
    ArrowRight,
    Layers,
    Cpu,
    CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';

const About = () => {
    return (
        <div className="min-h-screen flex flex-col justify-between py-12">
            <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
                
                {/* Hero / Overview Header */}
                <header className="text-center space-y-6 relative pt-8">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 blur-[140px] rounded-full -z-10 animate-pulse"></div>

                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-black text-indigo-400 uppercase tracking-widest"
                    >
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                        About The Platform
                    </motion.div>

                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-6xl lg:text-7xl font-black text-white uppercase font-mono tracking-tight leading-none"
                    >
                        Built For <span className="bg-gradient-to-r from-indigo-400 via-indigo-200 to-white bg-clip-text text-transparent italic">Competitive Cohorts</span>
                    </motion.h1>

                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 max-w-3xl mx-auto text-base sm:text-lg leading-relaxed font-medium"
                    >
                        EliteBoards is an enterprise-grade academic and competitive ranking ecosystem. Engineered to eliminate manual spreadsheets, outdated grade sheets, and fraudulent score entries with synchronous sub-10ms rankings and automated document verification.
                    </motion.p>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-wrap items-center justify-center gap-4 pt-4"
                    >
                        <a
                            href="https://leaderboard-xgi1.onrender.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 active:scale-95"
                        >
                            <Globe className="w-4 h-4" />
                            Live Web App
                        </a>
                        <Link
                            to="/docs"
                            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-widest border border-white/10 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <BookOpen className="w-4 h-4" />
                            Architecture Docs
                        </Link>
                        <Link
                            to="/app"
                            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-300 font-bold text-xs uppercase tracking-widest border border-indigo-500/20 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <Smartphone className="w-4 h-4" />
                            Mobile App
                        </Link>
                    </motion.div>
                </header>

                {/* Production Live Links Banner */}
                <section className="glass p-8 rounded-3xl border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-indigo-950/40 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 font-mono">Live In Production</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">Full Stack Academic Leaderboards</h2>
                        <p className="text-xs text-slate-400 font-mono">
                            URL: <a href="https://leaderboard-xgi1.onrender.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">https://leaderboard-xgi1.onrender.com</a>
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/"
                            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <Trophy className="w-4 h-4 text-indigo-400" />
                            Browse Leaderboards
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>

                {/* Architectural Pillars */}
                <section className="space-y-8">
                    <div className="text-center space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-indigo-400">System Architecture</p>
                        <h2 className="text-3xl sm:text-4xl font-black text-white uppercase font-mono">Core Architectural Pillars</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="glass p-8 rounded-3xl border-white/5 space-y-4 hover:border-indigo-500/30 transition-all">
                            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase font-mono">Real-Time Redis Engine</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Powered by Upstash Redis Sorted Sets (ZSets) with an O(log N) composite score engine. Ranks are recalculated instantly across thousands of entries and broadcast live via Socket.IO rooms.
                            </p>
                            <div className="pt-2 flex flex-col gap-1 text-xs font-mono text-indigo-400">
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Atomic Invalidation</span>
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Race-Condition Resilient</span>
                            </div>
                        </div>

                        <div className="glass p-8 rounded-3xl border-white/5 space-y-4 hover:border-emerald-500/30 transition-all">
                            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase font-mono">Document Verification</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Prevents fake submissions by validating university student IDs and grade cards. Sharp image compression, Tesseract OCR extraction, and OpenRouter LLM comparison verify legitimate academic standing.
                            </p>
                            <div className="pt-2 flex flex-col gap-1 text-xs font-mono text-emerald-400">
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> OCR Extraction</span>
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> LLM Hallucination Guard</span>
                            </div>
                        </div>

                        <div className="glass p-8 rounded-3xl border-white/5 space-y-4 hover:border-purple-500/30 transition-all">
                            <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase font-mono">Cross-Platform Parity</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Full-featured React 19 web app and native Expo SDK 55 mobile app for iOS and Android. Backed by TanStack Query, offline disk caching, and instant Over-The-Air (OTA) updates via Expo EAS.
                            </p>
                            <div className="pt-2 flex flex-col gap-1 text-xs font-mono text-purple-400">
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Offline First Cache</span>
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Zero-Downtime OTA</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Core Advantages */}
                <section className="space-y-8">
                    <div className="text-center space-y-2">
                        <div className="inline-block px-4 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            Competitive Advantages
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase font-mono">
                            Why <span className="text-indigo-400 italic">EliteBoards?</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="glass p-8 rounded-3xl group hover:border-indigo-500/50 transition-all">
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">Socket Powered</h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Instant real-time updates without page refreshes. Rank updates and reactions stream synchronously.
                            </p>
                        </div>
                        <div className="glass p-8 rounded-3xl group hover:border-emerald-500/50 transition-all">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">Smart Composite Rank</h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Composite tie-breaking logic handles CGPA, SGPA, and marks with deterministic timestamp resolution.
                            </p>
                        </div>
                        <div className="glass p-8 rounded-3xl group hover:border-purple-500/50 transition-all">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                                <Activity className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">Moderation Controls</h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Full creator and admin oversight. Pause submissions with confirmation modals, review reports, and audit entries.
                            </p>
                        </div>
                        <div className="glass p-8 rounded-3xl group hover:border-blue-500/50 transition-all">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                                <Download className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">Export & Audit</h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Export full cohorts to CSV or printable formats for academic audits and permanent archival.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Tech Stack Foundation */}
                <section className="py-12 border-t border-white/5 space-y-8">
                    <div className="text-center space-y-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] block">Scalable Architecture</span>
                        <h3 className="text-2xl font-black text-white uppercase font-mono tracking-widest">
                            Technological <span className="text-indigo-400">Foundation</span>
                        </h3>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-80 hover:opacity-100 transition-opacity duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center text-indigo-400 font-black font-mono">M</div>
                            <span className="text-slate-300 font-bold text-sm tracking-tight">MongoDB</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center text-indigo-400 font-black font-mono">E</div>
                            <span className="text-slate-300 font-bold text-sm tracking-tight">Express.js</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center text-indigo-400 font-black font-mono">R</div>
                            <span className="text-slate-300 font-bold text-sm tracking-tight">React 19</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center text-indigo-400 font-black font-mono">N</div>
                            <span className="text-slate-300 font-bold text-sm tracking-tight">Node.js</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center text-red-400 font-black font-mono">⚡</div>
                            <span className="text-slate-300 font-bold text-sm tracking-tight">Upstash Redis</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center text-indigo-400">
                                <Activity className="w-5 h-5 text-indigo-400" />
                            </div>
                            <span className="text-slate-300 font-bold text-sm tracking-tight">Socket.IO</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* Platform Footer */}
            <footer className="w-full border-t border-white/5 bg-[#020617]/50 pt-16 pb-8 mt-24 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                        <div className="flex flex-col items-center md:items-start gap-2">
                            <div className="flex items-center gap-2">
                                <span className="bg-gradient-to-r from-white via-indigo-200 to-slate-400 bg-clip-text text-transparent uppercase font-mono italic text-2xl font-black">Elite</span>
                                <span className="text-indigo-500 uppercase font-mono text-2xl font-black">Boards</span>
                            </div>
                            <p className="text-slate-400 text-sm max-w-sm text-center md:text-left mt-1 leading-relaxed">
                                Empowering student communities with real-time, verified competitive rankings.
                            </p>
                        </div>
                        <div className="flex flex-col items-center md:items-end gap-3">
                            <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Developed by</span>
                            <div className="flex items-center gap-3">
                                <a href="https://github.com/PARASMANI-KHUNTE" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-all p-2.5 glass rounded-full hover:bg-white/10 hover:-translate-y-1 duration-300" title="GitHub">
                                    <Github className="w-4 h-4" />
                                </a>
                                <a href="https://www.linkedin.com/in/parasmani-khunte-330488228/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-400 transition-all p-2.5 glass rounded-full hover:bg-white/10 hover:-translate-y-1 duration-300" title="LinkedIn">
                                    <Linkedin className="w-4 h-4" />
                                </a>
                                <a href="mailto:parasmanikhunte@gmail.com" className="text-slate-400 hover:text-teal-400 transition-all p-2.5 glass rounded-full hover:bg-white/10 hover:-translate-y-1 duration-300" title="Email">
                                    <Mail className="w-4 h-4" />
                                </a>
                                <a href="https://parasmanikhunte.onrender.com/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400 transition-all p-2.5 glass rounded-full hover:bg-white/10 hover:-translate-y-1 duration-300" title="Portfolio">
                                    <Globe className="w-4 h-4" />
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

export default About;
