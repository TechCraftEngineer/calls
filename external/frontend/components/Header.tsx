'use client';

import { User } from '@/lib/auth';

interface HeaderProps {
    user: User | null;
}

export default function Header({ user }: HeaderProps) {
    if (!user) return null;

    return (
        <header className="top-header">
            <div className="user-profile">
                <div className="profile-info" style={{ marginRight: '4px' }}>
                    <div className="profile-name" style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>
                        {user.name || user.username}
                    </div>
                    <div className="profile-role" style={{ fontSize: '10px', color: '#999', fontWeight: 800, textAlign: 'right', letterSpacing: '0.5px' }}>
                        {(user.username === 'admin@mango' || user.username === 'admin@gmail.com') ? 'АДМИНИСТРАТОР' : 'МЕНЕДЖЕР'}
                    </div>
                </div>
                <div className="profile-avatar" style={{ background: '#f5f5f7', border: '1px solid #eee', color: '#333', fontWeight: 600 }}>
                    {(user.name || user.username)[0].toUpperCase()}
                </div>
            </div>
        </header>
    );
}
