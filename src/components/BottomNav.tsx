'use client';
import { useRouter } from 'next/navigation';

const tabs = [
  { id: 'home', label: 'Home', icon: '🏠', path: '/' },
  { id: 'search', label: 'Search', icon: '🔍', path: '/search' },
  { id: 'liked', label: 'Liked', icon: '🤍', path: '/liked' },
  { id: 'upload', label: 'Upload', icon: '⬆', path: '/upload' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' },
];

export default function BottomNav({ active }: { active: string }) {
  const router = useRouter();
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
      background: 'rgba(10,5,5,0.98)', borderTop: '1px solid #1a1a1a',
      display: 'flex', height: 56,
      backdropFilter: 'blur(20px)',
    }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => router.push(tab.path)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 3, background: 'none', border: 'none',
          cursor: 'pointer', padding: 0,
          color: active === tab.id ? '#e53935' : '#555',
        }}>
          <span style={{ fontSize: 18 }}>{tab.icon}</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
