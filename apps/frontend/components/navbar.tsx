'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout, User } from '@/lib/auth';

interface NavbarProps {
    user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    return (
        <nav className="top-bar">
            <div className="brand">
                <Link href="/dashboard" className="brand-link">
                    <div className="logo">M</div>
                </Link>
                <div className="brand-info">
                    <div className="brand-title">Mango Office</div>
                    <div className="brand-subtitle">Call Intelligence</div>
                </div>
            </div>

            <div className="nav-links" style={{ display: 'flex', gap: '24px', marginLeft: '48px', flex: 1 }}>
                <Link href="/dashboard" className="nav-link" style={{ fontWeight: 500 }}>Дашборд</Link>
                <Link href="/statistics" className="nav-link" style={{ fontWeight: 500, opacity: 0.6 }}>Статистика</Link>
                <Link href="/users" className="nav-link" style={{ fontWeight: 500, opacity: 0.6 }}>Пользователи</Link>
                <Link href="/settings" className="nav-link" style={{ fontWeight: 500, opacity: 0.6 }}>Настройки</Link>
            </div>

            {user && (
                <div className="user-meta" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.username}</div>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        Выйти
                    </button>
                </div>
            )}
        </nav>
    );
}
