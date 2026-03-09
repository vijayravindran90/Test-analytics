import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Moon, Sun } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const swaggerDocsUrl = `${apiBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '')}/api/docs`;

  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary-500" />
          <h1 className="text-2xl font-bold text-neutral-900">Test Analytics</h1>
        </Link>
        <nav className="flex items-center gap-6">
          {isAuthenticated && (
            <Link to="/projects" className="text-neutral-600 hover:text-neutral-900">
              Projects
            </Link>
          )}
          <a
            href="https://github.com/vijayravindran90/Test-analytics/blob/main/docs/architecture.md"
            target="_blank"
            rel="noreferrer"
            className="text-neutral-600 hover:text-neutral-900"
          >
            Docs
          </a>
          <a
            href={swaggerDocsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-neutral-600 hover:text-neutral-900"
          >
            API Docs
          </a>
          <button
            type="button"
            onClick={onToggleTheme}
            className="btn btn-secondary flex items-center gap-2 px-3 py-1.5"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span className="text-sm">{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
          {isAuthenticated ? (
            <>
              <span className="text-sm text-neutral-500">{user?.email}</span>
              <button type="button" onClick={logout} className="btn btn-secondary px-3 py-1.5">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary px-3 py-1.5">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
