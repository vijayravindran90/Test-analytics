import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary-500" />
          <h1 className="text-2xl font-bold text-neutral-900">Test Analytics</h1>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/projects" className="text-neutral-600 hover:text-neutral-900">
            Projects
          </Link>
          <a href="#docs" className="text-neutral-600 hover:text-neutral-900">
            Docs
          </a>
        </nav>
      </div>
    </header>
  );
}
