'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Key, Mail, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // 1. Password mismatch validation
    if (password !== confirmPassword) {
      setError('New Password and Confirm Password must match.');
      return;
    }

    // 2. Minimum length validation (must be at least 8 characters)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Your password has been reset successfully. Please log in with your new password.');
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background soft glowing blur spheres */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square rounded-full bg-spotify-green/5 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] aspect-square rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none"></div>

      {/* Main card */}
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl relative z-10 flex flex-col items-center">
        
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => router.push('/login')}>
          <img src="/logo.jpg" alt="Musy-Fi Logo" className="w-10 h-10 rounded-full object-cover" />
          <span className="text-2xl font-black tracking-tight text-[#D62828]">Musy-Fi</span>
        </div>

        <div className="text-center mb-6 w-full">
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-4 transition-colors focus:outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </button>
          
          <h2 className="text-xl font-bold text-white mb-1.5">Reset Password</h2>
          <p className="text-xs text-zinc-400">
            Enter your details to securely update your password.
          </p>
        </div>

        {error && (
          <div className="w-full bg-red-950/40 border border-red-900/30 text-red-500 rounded px-4 py-3 text-xs font-semibold flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg ? (
          <div className="w-full text-center py-4 space-y-3">
            <div className="w-full bg-emerald-950/40 border border-emerald-900/30 text-emerald-500 rounded px-4 py-3 text-xs font-semibold flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>{successMsg}</span>
            </div>
            <p className="text-[10px] text-zinc-400 animate-pulse">Redirecting you to the login screen...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-spotify-green text-white placeholder-zinc-600 rounded px-10 py-2.5 text-sm focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">New Password</label>
              <div className="relative">
                <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-spotify-green text-white placeholder-zinc-600 rounded px-10 py-2.5 text-sm focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-spotify-green text-white placeholder-zinc-600 rounded px-10 py-2.5 text-sm focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-spotify-green hover:bg-spotify-green-hover disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold text-sm py-2.5 rounded-full mt-2 transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-98 hover:scale-[1.01]"
            >
              {loading ? (
                <span>Resetting...</span>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
