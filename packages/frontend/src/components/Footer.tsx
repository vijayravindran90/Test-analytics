import React from 'react';
import { Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <p className="text-sm text-neutral-600">Copyright (c) 2026 Vijay Ravindran</p>
        <a
          href="https://github.com/vijayravindran90/Test-analytics"
          target="_blank"
          rel="noreferrer"
          aria-label="Open GitHub repository"
          className="rounded-lg p-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
        >
          <Github className="h-5 w-5" />
        </a>
      </div>
    </footer>
  );
}
