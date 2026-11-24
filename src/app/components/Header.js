'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { History, Sun, Moon, BookOpen, GitCompare, ShieldCheck, Workflow, Menu, X } from 'lucide-react';

const THEME_EVENT = 'localpdf-theme-change';

function subscribeTheme(callback) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getThemeSnapshot() {
  return localStorage.getItem('localpdf_theme') === 'light' ? 'light' : 'dark';
}

function getThemeServerSnapshot() {
  return 'dark';
}

export default function Header() {
  const pathname = usePathname();
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Close menu when clicking outside the header or pressing Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('localpdf_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const isActive = (href) => {
    if (href === '/') return pathname === '/' || pathname?.startsWith('/tools');
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <header className="header" ref={headerRef}>
      {/* Logo */}
      <Link href="/" className="logo-container" onClick={closeMenu}>
        <div className="logo-icon" style={{ overflow: 'hidden', padding: 0 }}>
          <Image src="/logo.png" alt="LocalPDF Logo" width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="logo-text">
          Local<span>PDF</span>
        </div>
      </Link>

      {/* Nav — collapses into drawer on ≤ 640px */}
      <nav id="primary-nav" className={`nav-links${menuOpen ? ' nav-open' : ''}`} aria-label="Main navigation">
        <Link
          href="/"
          className={`nav-link${isActive('/') ? ' active' : ''}`}
          aria-current={isActive('/') ? 'page' : undefined}
          onClick={closeMenu}
        >
          Tools
        </Link>
        <Link
          href="/recipes"
          className={`nav-link${isActive('/recipes') ? ' active' : ''}`}
          aria-current={isActive('/recipes') ? 'page' : undefined}
          onClick={closeMenu}
        >
          <Workflow size={15} style={{ display: 'inline', verticalAlign: 'middle' }} aria-hidden="true" />
          {' '}Recipes
        </Link>
        <Link
          href="/blog"
          className={`nav-link${isActive('/blog') ? ' active' : ''}`}
          aria-current={isActive('/blog') ? 'page' : undefined}
          onClick={closeMenu}
        >
          <BookOpen size={15} style={{ display: 'inline', verticalAlign: 'middle' }} aria-hidden="true" />
          {' '}Blog
        </Link>
        <Link
          href="/compare"
          className={`nav-link${isActive('/compare') ? ' active' : ''}`}
          aria-current={isActive('/compare') ? 'page' : undefined}
          onClick={closeMenu}
        >
          <GitCompare size={15} style={{ display: 'inline', verticalAlign: 'middle' }} aria-hidden="true" />
          {' '}Compare
        </Link>
        <Link
          href="/security"
          className={`nav-link${isActive('/security') ? ' active' : ''}`}
          aria-current={isActive('/security') ? 'page' : undefined}
          onClick={closeMenu}
        >
          <ShieldCheck size={15} style={{ display: 'inline', verticalAlign: 'middle' }} aria-hidden="true" />
          {' '}Security
        </Link>

        {/* Visible on desktop and inside the drawer on mobile */}
        <Link
          href="/history"
          className={`nav-link nav-link-icon${isActive('/history') ? ' active' : ''}`}
          aria-current={isActive('/history') ? 'page' : undefined}
          title="Processing History"
          onClick={closeMenu}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <History size={16} aria-hidden="true" />
          <span className="nav-link-icon-label">History</span>
        </Link>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </button>
      </nav>

      {/* Hamburger button — visible only on mobile (≤ 640px) */}
      <button
        type="button"
        className="hamburger-btn"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="primary-nav"
      >
        {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>
    </header>
  );
}
