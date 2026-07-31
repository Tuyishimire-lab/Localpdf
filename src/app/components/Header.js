'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { History, Sun, Moon, BookOpen, GitCompare, Menu, X } from 'lucide-react';

export default function Header() {
  const [theme, setTheme] = useState('dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('localpdf_theme') || 'dark';
    setTheme(stored);
    document.documentElement.setAttribute('data-theme', stored);
  }, []);

  // Close menu when clicking outside the header
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('localpdf_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <header className="header" ref={headerRef}>
      {/* Logo */}
      <Link href="/" className="logo-container" onClick={closeMenu}>
        <div className="logo-icon" style={{ overflow: 'hidden', padding: 0 }}>
          <img src="/logo.png" alt="LocalPDF Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="logo-text">
          Local<span>PDF</span>
        </div>
      </Link>

      {/* Nav — collapses into drawer on ≤ 640px */}
      <nav className={`nav-links${menuOpen ? ' nav-open' : ''}`} aria-label="Main navigation">
        <Link href="/" className="nav-link" onClick={closeMenu}>Tools</Link>
        <Link href="/blog" className="nav-link" onClick={closeMenu}>
          <BookOpen size={15} style={{ display: 'inline', verticalAlign: 'middle' }} />
          {' '}Blog
        </Link>
        <Link href="/compare" className="nav-link" onClick={closeMenu}>
          <GitCompare size={15} style={{ display: 'inline', verticalAlign: 'middle' }} />
          {' '}Compare
        </Link>

        {/* These two are visible on desktop and inside the drawer on mobile */}
        <Link
          href="/history"
          className="nav-link nav-link-icon"
          title="Processing History"
          onClick={closeMenu}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <History size={16} />
          <span className="nav-link-icon-label">History</span>
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

      {/* Hamburger button — visible only on mobile (≤ 640px) */}
      <button
        className="hamburger-btn"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
    </header>
  );
}
