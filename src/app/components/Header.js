'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { History, Sun, Moon, BookOpen, GitCompare } from 'lucide-react';

export default function Header() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const stored = localStorage.getItem('localpdf_theme') || 'dark';
    setTheme(stored);
    document.documentElement.setAttribute('data-theme', stored);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('localpdf_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <header className="header">
      <Link href="/" className="logo-container">
        <div className="logo-icon" style={{ overflow: 'hidden', padding: 0 }}>
          <img src="/logo.png" alt="LocalPDF Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="logo-text">
          Local<span>PDF</span>
        </div>
      </Link>

      <nav className="nav-links">
        <Link href="/" className="nav-link">Tools</Link>
        <Link href="/blog" className="nav-link">
          <BookOpen size={15} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
          Blog
        </Link>
        <Link href="/compare" className="nav-link">
          <GitCompare size={15} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
          Compare
        </Link>
        <Link href="/history" className="nav-link" title="Processing History">
          <History size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </Link>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </nav>
    </header>
  );
}
