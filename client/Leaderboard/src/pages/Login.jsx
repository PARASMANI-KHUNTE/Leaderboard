import React from 'react';
import { Trophy } from 'lucide-react';
import API_URL from '../config';

const Login = () => {
    const handleGoogleLogin = () => {
        window.location.href = `${API_URL}/auth/google`;
    };

    return (
        <div className="min-h-[calc(100-4rem)] flex items-center justify-center p-4">
            <div className="max-w-md w-full glass p-8 space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                        <Trophy className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Welcome back</h2>
                    <p className="mt-2 text-slate-400">Sign in to submit your CGPA and see the leaderboard.</p>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 transition-all font-semibold shadow-xl"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    Continue with Google
                </button>

                <div className="mt-8 pt-8 border-t border-white/5 text-center text-sm text-slate-500">
                    By signing in, you agree to our Terms and Conditions.
                </div>
            </div>
        </div>
    );
};

export default Login;
