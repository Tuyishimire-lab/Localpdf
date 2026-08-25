export const dynamic = 'force-static';

import Link from 'next/link';
import { ShieldCheck, Code2, ExternalLink, User, MapPin, Mail } from 'lucide-react';

export const metadata = {
  title: 'About Us | LocalPDF',
  description: 'Learn how LocalPDF operates 100% locally in your web browser using WebAssembly. Read about our mission, open source codebase, and maintainer.',
  alternates: { canonical: 'https://www.uselocalpdf.com/about' },
};

export default function AboutPage() {
  return (
    <div className="info-page-container">
      <h1 className="info-page-title">About LocalPDF</h1>
      <p className="info-page-subtitle">A secure, client-side approach to PDF productivity</p>

      <div className="info-page-content">
        <p>
          Welcome to <strong>LocalPDF</strong>, a suite of free, high-performance web utility tools designed to make working with PDF documents easy, fast, and, above all, <strong>secure</strong>.
        </p>

        <h2>Our Mission</h2>
        <p>
          Most online PDF converters and editors force you to upload your files to remote cloud servers. If you are handling documents with sensitive information like tax forms, legal agreements, financial statements, contracts, or personal medical records, server-based processing introduces unacceptable security risks.
        </p>
        <p>
          Our mission is to eliminate that risk entirely. LocalPDF provides a comprehensive set of 21 standard PDF utilities that run <strong>entirely inside your browser</strong>. Your documents never upload to a backend server.
        </p>

        <h2>How It Works (100% Client-Side)</h2>
        <p>
          LocalPDF utilizes modern browser capabilities and compiled WebAssembly to perform complex document mutations on your computer&apos;s own hardware:
        </p>
        <ul>
          <li>
            <strong>WebAssembly (Wasm):</strong> We run high-performance compiled libraries directly in your browser tab. This enables fast compression, splitting, merging, formatting, and cryptographic operations.
          </li>
          <li>
            <strong>Client-Side Canvas Rendering:</strong> PDF pages are rendered directly into HTML5 canvas tags. When you view page previews, draw signatures, or add text watermarks, it happens in real-time on your screen.
          </li>
          <li>
            <strong>Local OCR &amp; NLP:</strong> Optical Character Recognition (Tesseract.js) and in-browser semantic analysis run locally in Web Workers, reading text from images and documents without external AI API calls.
          </li>
        </ul>

        <h2>Team &amp; Creator</h2>
        <p>
          LocalPDF is founded and maintained by <strong>Tuyishimire Angel</strong>, a software engineer based in <strong>Kigali, Rwanda</strong>. The project was created to provide a genuinely private, accessible, and fast alternative to closed, subscription-locked, server-dependent PDF services.
        </p>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem 1.25rem', margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} style={{ color: 'var(--primary-color)' }} />
            <span><strong>Maintainer:</strong> Tuyishimire Angel</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={16} style={{ color: 'var(--secondary-color)' }} />
            <span><strong>Location:</strong> Kigali, Rwanda</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={16} style={{ color: 'var(--text-muted)' }} />
            <span><strong>Contact:</strong> <a href="mailto:tuyishime1angel@gmail.com" style={{ color: 'var(--primary-color)' }}>tuyishime1angel@gmail.com</a></span>
          </div>
        </div>

        <h2>Open Source &amp; Provable Security</h2>
        <p>
          We believe in trust through transparency, not blind promises. LocalPDF is open-source, allowing anyone to inspect the code, verify that no files are uploaded, and contribute improvements:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', margin: '1rem 0' }}>
          <a
            href="https://github.com/Tuyishimire-lab/Localpdf"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Code2 size={16} /> View GitHub Repository <ExternalLink size={14} />
          </a>
          <Link
            href="/security"
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ShieldCheck size={16} /> Security &amp; DevTools Verification
          </Link>
        </div>

        <h2>Why Choose LocalPDF?</h2>
        <ul>
          <li><strong>100% Secure &amp; Private:</strong> Since no file uploads occur, your private data can never be intercepted, cached, or leaked on a remote server.</li>
          <li><strong>Works Offline:</strong> Once the page is loaded, you can disconnect from the internet and continue editing, merging, or protecting your PDFs.</li>
          <li><strong>Instant Processing:</strong> You don&apos;t have to wait for slow uploads or downloads. Processing happens instantly, limited only by your device&apos;s speed.</li>
          <li><strong>No Limits or Subscriptions:</strong> Merge, split, and edit as many files as you need, without subscribing or entering payment details.</li>
        </ul>

        <p style={{ marginTop: '2rem' }}>
          Have questions, suggestions, or bug reports? Feel free to reach out via our <Link href="/contact" style={{ color: 'var(--primary-color)' }}>Contact Page</Link>.
        </p>
      </div>
    </div>
  );
}
