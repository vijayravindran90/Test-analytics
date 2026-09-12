import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <p className="text-sm text-neutral-600">Copyright (c) 2026 Vijay Ravindran</p>
        <Link to="/contact-us" className="text-sm text-neutral-600 hover:text-neutral-900">
          Contact us
        </Link>
      </div>
    </footer>
  );
}
