import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, 
  Layers, 
  Cpu, 
  Smartphone, 
  Zap, 
  Shield, 
  Globe, 
  Database, 
  Server, 
  Code2, 
  ChevronRight, 
  ExternalLink,
  Terminal,
  Activity,
  UserCheck,
  Bell,
  Workflow
} from 'lucide-react';

const SECTIONS = [
  { id: 'intro', title: 'Introduction', icon: Book },
  { id: 'stack', title: 'Tech Stack', icon: Cpu },
  { id: 'arch', title: 'Architecture', icon: Layers },
  { id: 'features', title: 'Core Features', icon: Zap },
  { id: 'mobile', title: 'Mobile & OTA', icon: Smartphone },
  { id: 'ops', title: 'DevOps & CI/CD', icon: Workflow },
];

const TechCard = ({ title, items, icon: Icon, color }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl hover:border-indigo-500/30 transition-colors group"
  >
    <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      <Icon className={`w-6 h-6 text-${color}-400`} />
    </div>
    <h3 className="text-lg font-bold text-white mb-3 tracking-tight">{title}</h3>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="text-slate-400 text-sm flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          {item}
        </li>
      ))}
    </ul>
  </motion.div>
);

const Docs = () => {
  const [activeSection, setActiveSection] = useState('intro');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 100,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex gap-12 relative">
      {/* Sidebar Navigation */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-28 h-fit">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 pl-3">Documentation</p>
          {SECTIONS.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeSection === id 
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {title}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 space-y-24 pb-32">
        {/* Intro Section */}
        <section id="intro" className="scroll-mt-28">
          <div className="relative inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-6">
            EliteBoards v1.2.0
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-6 leading-[1.1]">
            Project <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600">Overview</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-2xl">
            EliteBoards is a premium, real-time leaderboard ecosystem designed for high-stakes competition. 
            It enables instant rankings, social interaction, and administrative control through a unified full-stack architecture.
          </p>
        </section>

        {/* Tech Stack Section */}
        <section id="stack" className="scroll-mt-28">
          <h2 className="text-3xl font-bold text-white mb-10 flex items-center gap-4">
            <Cpu className="w-8 h-8 text-indigo-500" />
            Tech Stack
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TechCard 
              title="Frontend (Web)" 
              color="indigo"
              icon={Globe}
              items={['React 19 (Modern UI)', 'Vite (Lightning Fast Build)', 'Tailwind CSS 4 (Styling)', 'Framer Motion (Animations)', 'Socket.io Client']}
            />
            <TechCard 
              title="Backend (API)" 
              color="blue"
              icon={Server}
              items={['Node.js (LTS)', 'Express 5 (Core Routing)', 'Socket.io (Realtime Events)', 'Passport.js (Auth Flows)', 'Web-Push (Notifications)']}
            />
            <TechCard 
              title="Persistence & Cache" 
              color="emerald"
              icon={Database}
              items={['MongoDB (NoSQL Warehouse)', 'Mongoose (ODM Layer)', 'Redis / Upstash (Global Caching)', 'Rate Limiting (Security)']}
            />
            <TechCard 
              title="Mobile (Native)" 
              color="purple"
              icon={Smartphone}
              items={['Expo (React Native Platform)', 'Expo Updates (OTA Updates)', 'EAS Build (Native Binaries)', 'Secure Store (Encrypted Auth)']}
            />
            <TechCard 
              title="Security & Auth" 
              color="amber"
              icon={Shield}
              items={['Google OAuth 2.0', 'JWT & Session Management', 'Helmet.js (HTTP Headers)', 'Input Validation (Express)', 'CORS Policy']}
            />
            <TechCard 
              title="Tools & Ecosystem" 
              color="slate"
              icon={Terminal}
              items={['ESLint (Code Quality)', 'GitHub Actions (CI/CD)', 'Terser (Optimization)', 'Lucide Icons (UX)', 'Canvas Confetti']}
            />
          </div>
        </section>

        {/* Architecture Section */}
        <section id="arch" className="scroll-mt-28">
          <h2 className="text-3xl font-bold text-white mb-10 flex items-center gap-4">
            <Layers className="w-8 h-8 text-indigo-500" />
            System Architecture
          </h2>
          <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 lg:p-12">
            <div className="max-w-3xl mx-auto space-y-12">
              <div className="flex flex-col items-center">
                <div className="p-4 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center gap-4">
                  <Globe className="w-6 h-6 text-indigo-400" />
                  <span className="font-bold text-white">React Web Client</span>
                  <div className="px-2 py-0.5 bg-slate-800 rounded text-[9px] text-slate-400 font-mono">PORT 5173</div>
                </div>
                <div className="w-px h-12 bg-gradient-to-b from-indigo-500/30 to-slate-800" />
              </div>

              <div className="grid grid-cols-3 items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-slate-800 border border-white/5 rounded-xl text-xs font-bold text-slate-300">
                    HTTPS / REST
                  </div>
                  <div className="h-px w-full bg-slate-800" />
                </div>
                <div className="flex flex-col items-center">
                  <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl shadow-[0_0_40px_rgba(99,102,241,0.2)] border border-white/20 flex flex-col items-center gap-3">
                    <Server className="w-10 h-10 text-white" />
                    <span className="font-black text-white uppercase tracking-wider">Express API Hub</span>
                    <div className="flex gap-2 text-[10px] items-center text-indigo-200">
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Realtime</span>
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Auth</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-slate-800 border border-white/5 rounded-xl text-xs font-bold text-slate-300 text-center">
                    WebSocket / Socket.io
                  </div>
                  <div className="h-px w-full bg-slate-800" />
                </div>
              </div>

              <div className="flex justify-center gap-8">
                <div className="flex flex-col items-center">
                  <div className="w-px h-8 bg-slate-800" />
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-200">MongoDB</span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-px h-8 bg-slate-800" />
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center gap-2">
                    <div className="w-5 h-5 flex items-center justify-center font-bold text-red-400">R</div>
                    <span className="text-xs font-bold text-red-200">Redis Cache</span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-px h-8 bg-slate-800" />
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex flex-col items-center gap-2">
                    <Smartphone className="w-5 h-5 text-purple-400" />
                    <span className="text-xs font-bold text-purple-200">Mobile OTA</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2 uppercase tracking-widest">
                <Code2 className="w-4 h-4" /> Data Flow Summary
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed font-mono">
                $ client.request → express.middleware (auth/valid) → database.query → socket.emit (broadcast) → client.update()
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="scroll-mt-28">
           <h2 className="text-3xl font-bold text-white mb-10 flex items-center gap-4">
            <Zap className="w-8 h-8 text-indigo-500" />
            Core Features
          </h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 bg-slate-900/40 border border-white/5 rounded-3xl hover:bg-slate-900/60 transition-colors">
                <div className="flex items-start gap-6 mb-6">
                  <div className="p-3 bg-indigo-500/20 rounded-xl">
                    <Activity className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Real-time Leaderboards</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Powered by Socket.io, every score update is broadcasted instantly to all active users. 
                      No page refreshes, just pure interactive rankings.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-900/40 border border-white/5 rounded-3xl hover:bg-slate-900/60 transition-colors">
                <div className="flex items-start gap-6 mb-6">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <UserCheck className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Global Authentication</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Integrated Google OAuth flow with session-based persistence. 
                      Secure, seamless entry for users across web and mobile platforms.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-900/40 border border-white/5 rounded-3xl hover:bg-slate-900/60 transition-colors">
                <div className="flex items-start gap-6 mb-6">
                  <div className="p-3 bg-amber-500/20 rounded-xl">
                    <Shield className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Admin Moderation</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Dedicated dashboard for managing users, banning malicious actors, and overseeing all rankings.
                      Includes real-time safety reporting.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-900/40 border border-white/5 rounded-3xl hover:bg-slate-900/60 transition-colors">
                <div className="flex items-start gap-6 mb-6">
                  <div className="p-3 bg-emerald-500/20 rounded-xl">
                    <Bell className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Push Notifications</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Cross-platform notification system keeping users informed of rank changes and social mentions, 
                      even when the app is closed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Section */}
        <section id="mobile" className="scroll-mt-28">
          <h2 className="text-3xl font-bold text-white mb-10 flex items-center gap-4">
            <Smartphone className="w-8 h-8 text-indigo-500" />
            Mobile & OTA
          </h2>
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/20 to-slate-950 border border-indigo-500/20 rounded-3xl p-8 lg:p-12">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Zap className="w-64 h-64 text-indigo-500" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <h3 className="text-2xl font-bold text-white mb-4">Expo Ecosystem Integration</h3>
              <p className="text-slate-400 mb-8 leading-relaxed">
                The EliteBoards mobile app is built on Expo, providing a bridge to high-performance native components while maintaining a single codebase.
              </p>
              
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="shrink-0 w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center font-bold text-indigo-400">01</div>
                  <div>
                    <h4 className="text-white font-bold mb-2">Over-The-Air (OTA) Updates</h4>
                    <p className="text-slate-500 text-sm">We use <code>expo-updates</code> to push JS and asset changes directly to your device without requiring a new app store download.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="shrink-0 w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center font-bold text-indigo-400">02</div>
                  <div>
                    <h4 className="text-white font-bold mb-2">EAS Native Builds</h4>
                    <p className="text-slate-500 text-sm">Automated pipeline generating AAB/APK artifacts for production, ensuring native performance and full hardware access.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="shrink-0 w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center font-bold text-indigo-400">03</div>
                  <div>
                    <h4 className="text-white font-bold mb-2">Cross-Platform Parity</h4>
                    <p className="text-slate-500 text-sm">Shared logic layers ensure that leaderboard features, auth states, and themes remain consistent across Web, Android, and iOS.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ops Section */}
        <section id="ops" className="scroll-mt-28">
          <h2 className="text-3xl font-bold text-white mb-10 flex items-center gap-4">
            <Workflow className="w-8 h-8 text-indigo-500" />
            DevOps & CI/CD
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-slate-900/60 border border-white/5 rounded-3xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-slate-500" />
                Pipeline Strategy
              </h3>
              <div className="space-y-4">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                  <p className="text-xs font-mono text-indigo-400 mb-2">// Automated Quality Check</p>
                  <code className="text-[10px] text-slate-300">npm test</code>
                </div>
                <p className="text-slate-400 text-sm">
                  Our one-command verification runs backend tests, web builds, and mobile doctor checks in a single workflow.
                </p>
              </div>
            </div>
            <div className="p-8 bg-slate-900/60 border border-white/5 rounded-3xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-500" />
                Production Readiness
              </h3>
              <ul className="text-sm text-slate-400 space-y-3">
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3 text-indigo-500" />
                  Health checks monitor DB and external services.
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3 text-indigo-500" />
                  Rate limiting protects against API abuse.
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3 text-indigo-500" />
                  Lazy loading optimizes initial web payloads.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Call to Action */}
      <div className="fixed bottom-8 left-8 z-50">
        <a 
          href="https://github.com/PARASMANI-KHUNTE/Leaderboard" 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-2 px-6 py-3 bg-white text-slate-950 rounded-full font-bold shadow-2xl hover:scale-105 transition-transform"
        >
          <Code2 className="w-4 h-4" />
          View Repository
        </a>
      </div>
    </div>
  );
};

export default Docs;
