import React from 'react';
import { motion } from 'framer-motion';
import { 
    Download, Smartphone, Zap, ShieldCheck, 
    Star, ArrowRight, History, Heart, 
    Users, Trophy, CheckCircle2 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AppPromo = () => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.6, ease: "easeOut" }
        }
    };

    const stats = [
        { label: 'Active Competitors', value: '1,200+', icon: <Users className="w-5 h-5" /> },
        { label: 'Global Installs', value: '5,000+', icon: <Download className="w-5 h-5" /> },
        { label: 'Community Likes', value: '850+', icon: <Heart className="w-5 h-5" /> },
        { label: 'Review Rating', value: '4.9/5', icon: <Star className="w-5 h-5" /> },
    ];

    const features = [
        {
            title: "Real-Time Updates",
            desc: "Stay in sync with instant leaderboard changes powered by real-time socket communication.",
            icon: <Zap className="w-6 h-6 text-indigo-400" />
        },
        {
            title: "Smart Ranking System",
            desc: "Accurate ranking with intelligent tie-handling — students with equal performance share the same rank.",
            icon: <Trophy className="w-6 h-6 text-emerald-400" />
        },
        {
            title: "Full Control",
            desc: "Admins and creators can manage boards, delete entries, and control system behavior with ease.",
            icon: <ShieldCheck className="w-6 h-6 text-yellow-400" />
        },
        {
            title: "Interactive Experience",
            desc: "Celebrate achievements with smooth animations and engaging visual feedback.",
            icon: <Heart className="w-6 h-6 text-pink-400" />
        },
        {
            title: "Export & Share",
            desc: "Export leaderboards instantly to CSV or PDF for reporting and sharing.",
            icon: <ArrowRight className="w-6 h-6 text-blue-400" />
        },
        {
            title: "Secure & Reliable",
            desc: "Built with secure authentication and environment-based configurations to keep data safe.",
            icon: <ShieldCheck className="w-6 h-6 text-slate-400" />
        }
    ];

    const steps = [
        {
            title: "Secured Profile",
            desc: "Authenticate instantly with secure OAuth and build your competitive identity.",
            icon: <ShieldCheck className="w-6 h-6" />
        },
        {
            title: "One-Tap Install",
            desc: "Download the high-performance APK directly from our encrypted servers.",
            icon: <Download className="w-6 h-6" />
        },
        {
            title: "Climb the Ranks",
            desc: "Submit scores, track progress, and dominate the local leaderboards in real-time.",
            icon: <Trophy className="w-6 h-6" />
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[150px] rounded-full"></div>
                <div className="absolute top-[40%] left-[30%] w-[10%] h-[10%] bg-blue-500/10 blur-[100px] rounded-full"></div>
            </div>

            <div className="relative z-10">
                {/* Hero Section */}
                <section className="max-w-7xl mx-auto px-4 pt-20 pb-20 md:pt-32 md:pb-32">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div 
                            initial="hidden"
                            animate="visible"
                            variants={containerVariants}
                            className="space-y-8"
                        >
                            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                                <Zap className="w-4 h-4 animate-pulse" />
                                Real-Time Leaderboards. Built for Results.
                            </motion.div>
                            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1]">
                                The Smarter Way to <br />
                                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient uppercase">Track Performance</span>
                            </motion.h1>
                            <motion.p variants={itemVariants} className="text-slate-400 text-lg md:text-xl max-w-lg leading-relaxed">
                                EliteBoards is a high-performance platform designed for students and cohorts to track rankings, monitor progress, and stay ahead — all in real time.
                            </motion.p>
                            <motion.div variants={itemVariants} className="flex flex-wrap gap-4 pt-4">
                                <a 
                                    href="/EliteLeaderboardv0_3.apk" 
                                    download 
                                    className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.3)] hover:shadow-indigo-500/50 transition-all active:scale-95 flex items-center gap-3 group"
                                >
                                    <Download className="w-6 h-6 group-hover:animate-bounce" />
                                    Download App
                                </a>
                                <Link 
                                    to="/releases" 
                                    className="px-10 py-5 bg-slate-900 border border-white/10 hover:border-indigo-500/50 text-white font-bold rounded-2xl transition-all flex items-center gap-3 backdrop-blur-md"
                                >
                                    <History className="w-5 h-5 text-indigo-400" />
                                    Version History
                                </Link>
                            </motion.div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8, x: 50 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="relative lg:block"
                        >
                            {/* Colorful Circle Background Wrapper */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-[120%] h-[120%] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-20 blur-3xl animate-pulse"></div>
                                <div className="absolute w-[80%] h-[80%] bg-gradient-to-tr from-indigo-600 to-purple-800 rounded-full shadow-[0_0_100px_rgba(79,70,229,0.4)]"></div>
                            </div>
                            
                            {/* Phone Mockup using user screenshot */}
                            <div className="relative z-10 flex justify-center">
                                <motion.div 
                                    animate={{ 
                                        y: [0, -20, 0],
                                        rotate: [0, 1, 0, -1, 0]
                                    }}
                                    transition={{ 
                                        duration: 6, 
                                        repeat: Infinity, 
                                        ease: "easeInOut" 
                                    }}
                                    className="w-[280px] md:w-[320px] aspect-[1/2] rounded-[3rem] border-8 border-slate-900 shadow-2xl overflow-hidden bg-slate-800 ring-1 ring-white/10"
                                >
                                    <img 
                                        src="/landing page.jpg" 
                                        alt="App Interface" 
                                        className="w-full h-full object-cover"
                                    />
                                </motion.div>
                                
                                {/* Floating elements */}
                                <motion.div 
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="absolute -top-10 -right-10 p-6 glass rounded-3xl border-white/20 shadow-xl hidden md:block"
                                >
                                    <Trophy className="w-10 h-10 text-yellow-400 mb-2" />
                                    <div className="text-[10px] font-black uppercase text-slate-500">Rank #1</div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="border-y border-white/5 bg-slate-900/30 backdrop-blur-3xl py-12">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            {stats.map((stat, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="text-center space-y-2 border-r last:border-0 border-white/5"
                                >
                                    <div className="flex items-center justify-center gap-2 text-indigo-400 mb-1">
                                        {stat.icon}
                                    </div>
                                    <div className="text-3xl md:text-4xl font-black text-white">{stat.value}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="max-w-7xl mx-auto px-4 py-32">
                    <div className="text-center mb-20 space-y-4">
                        <div className="text-indigo-500 font-black uppercase tracking-[0.3em] text-xs">Features Overview</div>
                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Your Performance, <span className="text-indigo-500">Measured Right</span></h2>
                        <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed">A modern leaderboard system designed to help students and teams track progress, improve consistency, and achieve better outcomes.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                whileHover={{ y: -10 }}
                                className="p-8 glass rounded-[2.5rem] border-white/5 hover:border-indigo-500/30 transition-all group shadow-2xl"
                            >
                                <div className="w-14 h-14 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tighter leading-tight">{feature.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Tech Power Section for AppPromo */}
                    <div className="mt-32 pt-20 border-t border-white/5">
                        <div className="text-center mb-12">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4 block">Engineered for Performance</span>
                            <h3 className="text-2xl font-black text-white uppercase font-mono tracking-widest text-glow-sm">Technology <span className="text-indigo-500">Stack</span></h3>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-10 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700 pb-10">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                <span className="text-indigo-400 font-bold font-mono">MERN</span>
                                <span className="text-slate-400 text-[10px] font-black uppercase">Stack</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                <Zap className="w-4 h-4 text-yellow-500" />
                                <span className="text-slate-400 text-[10px] font-black uppercase">Socket.io</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                <span className="text-slate-400 text-[10px] font-black uppercase">OAuth 2.0</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* "Manage Everything" Section */}
                <section className="bg-slate-900/20 py-32 relative overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div 
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative flex justify-center order-2 lg:order-1"
                        >
                            {/* Decorative background for the second screen */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-[110%] h-[110%] border border-white/5 rounded-full"></div>
                                <div className="absolute w-[90%] h-[90%] border border-white/5 rounded-full animate-ping duration-[3000ms]"></div>
                            </div>
                            
                            <div className="relative z-10 w-[280px] md:w-[320px] aspect-[1/2] rounded-[3rem] border-8 border-slate-900 shadow-2xl overflow-hidden bg-slate-800 ring-1 ring-white/10">
                                <img 
                                    src="/leaderboadpage.jpg" 
                                    alt="Leaderboard Interface" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </motion.div>

                        <div className="space-y-12 order-1 lg:order-2">
                            <div className="space-y-4">
                                <div className="text-indigo-400 font-bold uppercase tracking-widest text-xs">All Your Data. One Powerful System.</div>
                                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">Manage Everything. <span className="text-indigo-500 italic">Effortlessly.</span></h2>
                                <p className="text-slate-500 max-w-lg leading-relaxed">Monitor live performance, manage multiple leaderboards, and get instant updates — all from a unified dashboard designed for speed and clarity.</p>
                            </div>

                            <div className="space-y-10 relative">
                                {/* Vertical Line Connection */}
                                <div className="absolute left-[31px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 opacity-20 hidden md:block"></div>
                                
                                {steps.map((step, idx) => (
                                    <motion.div 
                                        key={idx}
                                        initial={{ opacity: 0, x: 30 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.2 }}
                                        className="flex items-start gap-8 relative z-10"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-indigo-400 shadow-xl group hover:border-indigo-500/50 transition-colors shrink-0">
                                            {step.icon}
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">{step.title}</h3>
                                            <p className="text-slate-500 text-sm leading-relaxed max-w-md">{step.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bottom CTA / Dashboard Section */}
                <section className="max-w-7xl mx-auto px-4 py-32 text-center overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="space-y-8 mb-20"
                    >
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase font-mono">Start Competing. <br />Start <span className="text-indigo-500">Improving.</span></h2>
                        <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed font-medium">
                            Join a smarter way of tracking performance and pushing your limits.
                        </p>
                        <div className="flex flex-wrap justify-center gap-6">
                            <Link 
                                to="/" 
                                className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl hover:shadow-indigo-500/40 transition-all flex items-center gap-3 uppercase tracking-widest text-sm"
                            >
                                <Zap className="w-5 h-5" />
                                Get Started
                            </Link>
                            <a 
                                href="/EliteLeaderboardv0_3.apk" 
                                download 
                                className="px-12 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black hover:border-indigo-500/50 transition-all flex items-center gap-3 uppercase tracking-widest text-sm"
                            >
                                <Download className="w-5 h-5" />
                                Download App
                            </a>
                        </div>
                    </motion.div>

                    {/* Screenshot Preview with reflection effect */}
                    <div className="relative max-w-5xl mx-auto group">
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 to-transparent z-20"></div>
                        <motion.div 
                            whileInView={{ 
                                perspective: 1000,
                                rotateX: [10, 0],
                                transition: { duration: 1.5, ease: "easeOut" }
                            }}
                            viewport={{ once: true }}
                            className="bg-slate-900 rounded-[3rem] border border-white/10 p-2 shadow-3xl transform-gpu overflow-hidden"
                        >
                            <img 
                                src="/footer.jpg" 
                                alt="Dashboard Preview" 
                                className="w-full rounded-[2.8rem] opacity-90 group-hover:opacity-100 transition-opacity duration-700"
                            />
                        </motion.div>
                        
                        {/* Final Download Button */}
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
                            <a 
                                href="/EliteLeaderboardv0_3.apk" 
                                download 
                                className="px-12 py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-3xl shadow-[0_0_60px_rgba(79,70,229,0.5)] active:scale-95 transition-all text-xl uppercase tracking-tighter flex items-center gap-4"
                            >
                                <Download className="w-8 h-8" />
                                Get Started Now
                            </a>
                        </div>
                    </div>
                </section>

                {/* Footer Section */}
                <footer className="border-t border-white/5 py-12 bg-slate-950/50 backdrop-blur-md">
                    <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-3">
                            <Trophy className="w-6 h-6 text-indigo-500" />
                            <span className="text-2xl font-black uppercase font-mono tracking-tighter text-white">EliteBoards</span>
                        </div>
                        <div className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">
                            &copy; 2026 EliteBoards App. All rights reserved.
                        </div>
                        <div className="flex gap-6">
                            <Link to="/releases" className="text-slate-500 hover:text-indigo-400 font-bold uppercase text-[10px] tracking-widest transition-colors">Archive</Link>
                            <Link to="/" className="text-slate-500 hover:text-indigo-400 font-bold uppercase text-[10px] tracking-widest transition-colors">Web App</Link>
                            <Link to="/login" className="text-slate-500 hover:text-indigo-400 font-bold uppercase text-[10px] tracking-widest transition-colors">Account</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default AppPromo;
