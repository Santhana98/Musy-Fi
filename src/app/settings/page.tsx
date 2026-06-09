'use client';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [theme, setTheme] = useState<'male' | 'female'>('male');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    const saved = localStorage.getItem('musyfi-theme') as 'male' | 'female';
    if (saved) setTheme(saved);
  }, [status]);

  const switchTheme = (t: 'male' | 'female') => {
    setTheme(t);
    localStorage.setItem('musyfi-theme', t);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 10px', borderBottom: '1px solid #1a1a1a' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Settings</h1>
        <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Configure your account details</p>
      </div>
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#111', borderRadius: 14, padding: '18px 16px', border: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#e53935,#ff7043)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👤</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{session?.user?.name || 'User'}</div>
              <div style={{ color: '#666', fontSize: 13 }}>{session?.user?.email}</div>
            </div>
          </div>
        </div>

        <div style={{ background: '#111', borderRadius: 14, padding: '18px 16px', border: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ color: '#e53935' }}>🎨</span>
            <h3 style={{ fontWeight: 800, fontSize: 16 }}>Personalized Theme Settings</h3>
          </div>
          <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Choose Theme Background — personalizes the interface with your preferred artwork.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => switchTheme('male')} style={{
              flex: 1, padding: '12px', borderRadius: 24,
              background: theme === 'male' ? '#1a1a1a' : 'transparent',
              border: theme === 'male' ? '2px solid #e53935' : '2px solid #2a2a2a',
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}>🧑 Male Theme</button>
            <button onClick={() => switchTheme('female')} style={{
              flex: 1, padding: '12px', borderRadius: 24,
              background: theme === 'female' ? 'linear-gradient(135deg,#e53935,#ff7043)' : 'transparent',
              border: theme === 'female' ? '2px solid #e53935' : '2px solid #2a2a2a',
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}>👩 Female Theme</button>
          </div>
        </div>

        <button onClick={() => signOut({ callbackUrl: '/login' })} style={{
          width: '100%', padding: '14px',
          background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)',
          borderRadius: 12, color: '#e53935', fontWeight: 800, fontSize: 15, cursor: 'pointer',
        }}>Sign Out</button>
      </div>
      <BottomNav active="settings" />
    </div>
  );
}
