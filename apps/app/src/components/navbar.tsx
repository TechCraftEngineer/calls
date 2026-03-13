"use client";

import { paths } from "@calls/config";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout, type User } from "@/lib/auth";

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push(paths.auth.signin);
  };

  return (
    <nav className="top-bar">
      <div className="brand">
        <Link href={paths.dashboard.root} className="brand-link">
          <div className="logo">M</div>
        </Link>
        <div className="brand-info">
          <div className="brand-title">Mango Office</div>
          <div className="brand-subtitle">Аналитика звонков</div>
        </div>
      </div>

      <div className="nav-links flex gap-6 ml-12 flex-1">
        <Link href={paths.dashboard.root} className="nav-link font-medium">
          Панель
        </Link>
        <Link
          href={paths.statistics.root}
          className="nav-link font-medium opacity-60"
        >
          Статистика
        </Link>
        <Link
          href={paths.users.root}
          className="nav-link font-medium opacity-60"
        >
          Пользователи
        </Link>
        <Link
          href={paths.settings.root}
          className="nav-link font-medium opacity-60"
        >
          Настройки
        </Link>
      </div>

      {user && (
        <div className="user-meta flex items-center gap-4">
          <div className="text-right">
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.username}</div>
          </div>
          <button
            onClick={handleLogout}
            type="button"
            className="bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded cursor-pointer text-xs hover:bg-white/20 transition-colors"
          >
            Выйти
          </button>
        </div>
      )}
    </nav>
  );
}
