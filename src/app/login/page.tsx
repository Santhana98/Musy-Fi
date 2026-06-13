'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', {
      email, password, name,
      isSignup: isSignup ? 'true' : 'false',
      redirect: false,
    });
    setLoading(false);
    if (res?.error) setError(res.error);
    else router.push('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(/bg-login-cassette.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.35,
        backgroundColor: '#000',
      }} />

      <div style={{
        width: '100%', maxWidth: 420,
        background: 'rgba(20,8,8,0.92)',
        borderRadius: 20,
        border: '1px solid rgba(229,57,53,0.15)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
        padding: '2.5rem 2rem',
        backdropFilter: 'blur(20px)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <img src="/logo.jpg" alt="Musy-Fi Logo" style={{
            width: 64, height: 64, borderRadius: '50%',
            objectFit: 'cover',
            margin: '0 auto 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }} />
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#e53935', fontFamily: 'Georgia, serif' }}>Musy-Fi</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 6 }}>
            {isSignup ? 'Create your account' : 'Log in to continue'}
          </p>
          <p style={{ color: '#666', fontSize: 12, marginTop: 2 }}>🎧 Your Music. Your Vibe.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isSignup && (
            <div>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Your Name</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>👤</span>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name" required
                  style={{ width: '100%', padding: '13px 14px 13px 40px', background: '#0d0505', border: '1px solid #2a1010', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>✉️</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                style={{ width: '100%', padding: '13px 14px 13px 40px', background: '#0d0505', border: '1px solid #2a1010', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Password</label>
              {!isSignup && <span style={{ fontSize: 12, color: '#e53935', cursor: 'pointer' }}>Forgot Password?</span>}
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔑</span>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{ width: '100%', padding: '13px 14px 13px 40px', background: '#0d0505', border: '1px solid #2a1010', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none' }}
              />
            </div>
          </div>

          {error && (
            <p style={{ color: '#ff4444', fontSize: 13, background: 'rgba(255,68,68,0.1)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,68,68,0.2)' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} style={{
            padding: '14px', background: 'linear-gradient(135deg, #e53935, #c62828)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontWeight: 800, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, marginTop: 4,
          }}>
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In →'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#2a1010' }} />
          <span style={{ color: '#555', fontSize: 12 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: '#2a1010' }} />
        </div>

        <button onClick={() => signIn('google', { callbackUrl: '/' })} style={{
          width: '100%', padding: '13px', background: '#111',
          color: '#fff', border: '1px solid #2a2a2a', borderRadius: 12,
          fontWeight: 700, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginBottom: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', color: '#555', fontSize: 13, marginTop: 16 }}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={() => { setIsSignup(!isSignup); setError(''); }}
            style={{ color: '#e53935', cursor: 'pointer', fontWeight: 700 }}>
            {isSignup ? 'Sign In' : 'Sign Up'}
          </span>
        </p>
      </div>
    </div>
  );
}
