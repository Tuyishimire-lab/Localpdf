'use client';

import Link from 'next/link';

export default function Header() {
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
      </nav>
    </header>
  );
}
