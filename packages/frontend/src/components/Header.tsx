import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, ChevronDown, Moon, Sun } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import apiClient from '../api/client';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState('');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [generatingApiKey, setGeneratingApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleGenerateApiKey = async () => {
    setApiKeyError(null);
    setGeneratingApiKey(true);
    try {
      const response = await apiClient.post('/auth/api-key');
      setGeneratedApiKey(response.data.apiKey);
      setIsApiModalOpen(true);
      setCopied(false);
    } catch (error: any) {
      setApiKeyError(error?.response?.data?.error || 'Unable to generate API key.');
    } finally {
      setGeneratingApiKey(false);
    }
  };

  const handleCopyKey = async () => {
    if (!generatedApiKey) return;
    await navigator.clipboard.writeText(generatedApiKey);
    setCopied(true);
  };

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
          <Link to="/pricing" className="text-neutral-600 hover:text-neutral-900">
            Pricing
          </Link>
          <Link to="/docs" className="text-neutral-600 hover:text-neutral-900">
            Documentation
          </Link>
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
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 shadow-sm hover:border-neutral-300"
              >
                <span>{user?.name || user?.email}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/integration');
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    Integration
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/billing');
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleGenerateApiKey();
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    Add API key
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/pricing" className="btn btn-primary px-3 py-1.5">
              Get Started
            </Link>
          )}
        </nav>
      </div>

      {isApiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Your API key</h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Copy this key into your environment and use it in your Playwright reporter configuration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsApiModalOpen(false)}
                className="text-sm font-semibold text-neutral-600 hover:text-neutral-900"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {apiKeyError ? (
                <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                  {apiKeyError}
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 text-sm">
                    <code className="break-all text-neutral-900">{generatedApiKey || 'Generating API key...'}</code>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      disabled={!generatedApiKey}
                      onClick={handleCopyKey}
                      className="btn btn-primary w-full sm:w-auto"
                    >
                      {copied ? 'Copied!' : 'Copy API key'}
                    </button>
                    <span className="text-sm text-neutral-600">
                      Add to your `.env` as <strong>API_KEY</strong> and reference it in `playwright.config.ts`.
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
              <p className="font-semibold">Playwright config example</p>
              <pre className="mt-2 whitespace-pre-wrap">
{`reporter: [
  ['html'],
  [
    'test-analytics-reporter',
    {
      backendUrl: 'https://test-analytics-production.up.railway.app/api',
      projectId: '<your-project-id>',
      projectName: '<your-project-name>',
      apiKey: process.env.API_KEY,
      enabled: true,
    },
  ],
],`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
