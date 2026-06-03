'use client';

import React, { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Disc, Download, Key, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installMsg, setInstallMsg] = useState<string | null>(null);
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallMsg(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    setInstallMsg(null);

    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        setInstallMsg('Installing Musi-Fi as a standalone app...');
      } else {
        setInstallMsg('Install was cancelled. You can try again anytime.');
      }

      setInstallPrompt(null);
      return;
    }

    if (isIOS) {
      setInstallMsg('On iPhone, tap Share in Safari, then choose Add to Home Screen.');
      return;
    }

    setInstallMsg('Open your browser menu and choose Install app or Add to Home screen.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (isSignUp) {
      // Register Flow
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();
        
        if (res.ok) {
          setSuccessMsg('Account created successfully! Logging in...');
          
          // Auto log in after signup
          const result = await signIn('credentials', {
            redirect: false,
            email,
            password,
          });

          if (result?.error) {
            setError(result.error);
            setIsSignUp(false); // fall back to sign in
          } else {
            router.push('/');
          }
        } else {
          setError(data.error || 'Registration failed');
        }
      } catch (err) {
        setError('Connection failed. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Sign In Flow
      try {
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError(result.error);
          setLoading(false);
        } else {
          router.push('/');
        }
      } catch (err) {
        setError('An unexpected error occurred.');
        setLoading(false);
      }
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-4 text-zinc-500">
        <img src="/logo.jpg" alt="Musi-Fi Logo" className="w-12 h-12 rounded-full object-cover animate-pulse" />
        <span className="text-sm font-semibold tracking-wide animate-pulse">Loading Musi-Fi...</span>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden select-none bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'linear-gradient(to bottom, rgba(7, 7, 8, 0.4), rgba(7, 7, 8, 0.7)), url(/bg-login-cassette.jpg)' }}
    >
      
      {/* Background soft glowing blur spheres */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square rounded-full bg-spotify-green/5 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] aspect-square rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none"></div>

      {/* Main card */}
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl relative z-10 flex flex-col items-center">
        
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8 cursor-default">
          <img src="/logo.jpg" alt="Musi-Fi Logo" className="w-10 h-10 rounded-full object-cover" />
          <span className="text-2xl font-black tracking-tight text-[#D62828]">Musi-Fi</span>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-1.5">
            {isSignUp ? 'Create your account' : 'Log in to continue'}
          </h2>
          <p className="text-xs text-zinc-400">
            {isSignUp 
              ? 'Get unlimited access to cloud playback.' 
              : '🎧 Your Music. Your Vibe.'
            }
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="w-full bg-red-950/40 border border-red-900/30 text-red-500 rounded px-4 py-3 text-xs font-semibold flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="w-full bg-emerald-950/40 border border-emerald-900/30 text-emerald-500 rounded px-4 py-3 text-xs font-semibold flex items-center gap-2 mb-4">
            <Disc className="w-4 h-4 flex-shrink-0 animate-spin" />
            <span>{successMsg}</span>
          </div>
        )}

        {installMsg && (
          <div className="w-full bg-zinc-950/60 border border-zinc-800 text-zinc-300 rounded px-4 py-3 text-xs font-semibold flex items-start gap-2 mb-4">
            <Download className="w-4 h-4 flex-shrink-0 text-spotify-green mt-0.5" />
            <span>{installMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-spotify-green text-white placeholder-zinc-600 rounded px-10 py-2.5 text-sm focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

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
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Password</label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => router.push('/reset-password')}
                  className="text-[10px] text-zinc-400 hover:text-spotify-green hover:underline font-bold transition-all focus:outline-none"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              <span>Processing...</span>
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full border border-zinc-700 hover:border-spotify-green bg-zinc-950/60 hover:bg-zinc-900/80 text-white font-bold text-sm py-2.5 rounded-full mt-4 transition-all flex items-center justify-center gap-2 active:scale-98 hover:scale-[1.01]"
        >
          <Download className="w-4 h-4" />
          <span>Install Now</span>
        </button>

        {/* Toggle View */}
        <p className="text-xs text-zinc-400 mt-8">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-spotify-green hover:underline font-bold"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>

      </div>
    </div>
  );
}
