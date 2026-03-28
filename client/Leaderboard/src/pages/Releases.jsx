import React from 'react';
import { Download, Smartphone, Zap, ShieldCheck, History, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const versions = [
    {
        version: 'v0.1',
        tag: 'Initial',
        date: 'March 28, 2026',
        filename: 'EliteLeaderboard.apk',
        downloadUrl: 'https://github.com/PARASMANI-KHUNTE/Leaderboard/releases/download/v1.0.0/EliteLeaderboard.apk',
        description: 'EliteBoards v0.1 – Initial stable mobile release with real-time leaderboard sync and smart ranking.',
        features: ['Real-time Sync', 'Smart Ranking Engine', 'Premium UI Design', 'Secure Authentication'],
        isLatest: true,
        type: 'Stable'
    }
];

const Releases = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 pt-10">
            {/* Background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
                        <Smartphone className="w-4 h-4" />
                        Mobile Distribution
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-white via-indigo-100 to-slate-400 bg-clip-text text-transparent tracking-tight mb-6">
                        Release <span className="text-indigo-500 text-shadow-glow">Archive</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                        Download the latest version of the EliteLeaderboard mobile app or choose from our version history. Optimized for Android devices.
                    </p>
                </div>

                {/* Main Download Card (Latest) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
                    <div className="lg:col-span-8">
                        <div className="group relative bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 overflow-hidden hover:border-indigo-500/30 transition-all duration-500">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap className="w-32 h-32 text-indigo-500" />
                            </div>
                            
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-3xl font-black text-white">{versions[0].version}</h2>
                                        <span className="px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest ring-4 ring-indigo-600/20">
                                            {versions[0].tag}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">{versions[0].date}</p>
                                </div>
                                <a 
                                    href={versions[0].downloadUrl} 
                                    download
                                    className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all group"
                                >
                                    <Download className="w-5 h-5 group-hover:animate-bounce" />
                                    Download Latest APK
                                </a>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                                        What's New
                                    </h3>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                        {versions[0].description}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                        <Star className="w-4 h-4 text-indigo-400" />
                                        Key Highlights
                                    </h3>
                                    <ul className="space-y-2">
                                        {versions[0].features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats / Info */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Requirements</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Platform</span>
                                    <span className="text-slate-200 font-mono">Android 8.0+</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">File Size</span>
                                    <span className="text-slate-200 font-mono">~95MB</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Developer</span>
                                    <span className="text-indigo-400 font-bold">EliteBoards Team</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                            <h3 className="text-white font-bold mb-2 text-sm">Official Build</h3>
                            <p className="text-indigo-200/60 text-[10px] leading-relaxed mb-4">
                                This is the official APK build. Make sure to enable "Install from Unknown Sources" in your device settings.
                            </p>
                            <Link to="/" className="text-xs font-black text-white hover:text-indigo-400 transition-colors inline-flex items-center gap-2 group">
                                Back to Main App <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-2 bg-slate-900 rounded-lg border border-white/10">
                            <History className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Previous Releases</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {versions.slice(1).map((v, idx) => (
                            <div key={idx} className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-indigo-500/20 transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-xl font-black text-white">{v.version}</h3>
                                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500 text-[8px] font-bold uppercase tracking-widest">
                                                {v.type}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-mono uppercase">{v.date}</p>
                                    </div>
                                    <a 
                                        href={v.downloadUrl} 
                                        download
                                        className="p-3 bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/40 rounded-xl transition-all"
                                    >
                                        <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
                                    </a>
                                </div>
                                <p className="text-slate-400 text-xs leading-relaxed mb-4">
                                    {v.description}
                                </p>
                                <div className="pt-4 border-t border-white/5">
                                    <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">Build Details</div>
                                    <div className="flex flex-wrap gap-2">
                                        {v.features.map((f, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-white/5 rounded-md text-[8px] font-medium text-slate-500 border border-white/5">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Releases;
