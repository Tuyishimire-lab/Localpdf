export const dynamic = 'force-static';

import Link from 'next/link';
import { ShieldCheck, Lock, Code2, Eye, ExternalLink, FileCode, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';

export const metadata = {
  title: 'Security & Transparency | LocalPDF',
  description: 'Learn how LocalPDF provides verifiable, client-side document security. Read our open source architecture, verify zero server uploads with DevTools, and inspect our security model.',
  alternates: { canonical: 'https://www.uselocalpdf.com/security' },
};

export default function SecurityPage() {
  return (
    <div className="info-page-container" style={{ maxWidth: '920px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(46, 213, 115, 0.1)', color: 'var(--success-color)', padding: '0.35rem 0.85rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
        <ShieldCheck size={16} /> Verifiable Client-Side Security
      </div>
      <h1 className="info-page-title">Security &amp; Transparency</h1>
      <p className="info-page-subtitle">
        We believe privacy should be provable by architecture, not merely promised in a policy.
      </p>

      <div className="info-page-content">
        <p>
          Most cloud PDF websites require blind trust: you upload your confidential legal agreements, tax forms, or medical records to their remote servers, and trust their promise to delete the files afterwards.
        </p>
        <p>
          <strong>LocalPDF is engineered on a fundamentally different security paradigm:</strong> your documents never leave your browser. Below is a complete, transparent breakdown of our technical security model, our open-source codebase, and how you can independently verify our zero-upload guarantee.
        </p>

        <h2>1. How to Verify Zero Uploads Yourself (Step-by-Step)</h2>
        <p>
          You do not need to take our word for it. You can inspect every network request your browser makes in real-time using built-in browser developer tools:
        </p>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', margin: '1.5rem 0' }}>
          <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', margin: 0 }}>
            <li>
              <strong>Open Developer Tools:</strong> Press <kbd style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>F12</kbd> (or <kbd style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Ctrl+Shift+I</kbd> on Windows / <kbd style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Cmd+Option+I</kbd> on Mac).
            </li>
            <li>
              <strong>Switch to the Network Tab:</strong> Click the <strong>Network</strong> tab at the top and filter by <strong>Fetch/XHR</strong>.
            </li>
            <li>
              <strong>Process Any PDF:</strong> Load any document into a tool (e.g., <Link href="/tools/compress" style={{ color: 'var(--primary-color)' }}>Compress</Link>, <Link href="/tools/merge" style={{ color: 'var(--primary-color)' }}>Merge</Link>, or <Link href="/tools/redact" style={{ color: 'var(--primary-color)' }}>Redact</Link>) and click the action button.
            </li>
            <li>
              <strong>Inspect the Traffic:</strong> Notice that <strong>zero bytes</strong> of document payload are transmitted. The only outgoing network requests are static assets (fonts, WebAssembly binaries) loaded on initial page visit.
            </li>
          </ol>
        </div>

        <h2>2. Open Source Codebase &amp; Transparency</h2>
        <p>
          LocalPDF is open-source and built on open web standards. We publish our source code so developers, security researchers, and privacy advocates can audit our client-side pipelines:
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255, 71, 87, 0.05)', border: '1px solid rgba(255, 71, 87, 0.2)', borderRadius: '10px', padding: '1.25rem', margin: '1rem 0' }}>
          <Code2 size={28} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>GitHub Repository</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.5rem 0' }}>
              Inspect the Next.js frontend, WebAssembly bindings, and tool components on GitHub.
            </p>
            <a
              href="https://github.com/Tuyishimire-lab/Localpdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
            >
              View on GitHub <ExternalLink size={13} />
            </a>
          </div>
        </div>

        <h2>3. Proven Open-Source Security Engines</h2>
        <p>
          We do not use proprietary black-box binaries. Every document transformation is executed using established, audited open-source libraries:
        </p>
        <ul>
          <li>
            <strong>pdf-lib:</strong> Industry-standard client-side library for creating, merging, splitting, watermarking, encrypting, and modifying PDF byte streams in JavaScript.
          </li>
          <li>
            <strong>Mozilla pdfjs-dist:</strong> Mozilla&apos;s battle-tested PDF rendering engine that powers Firefox&apos;s built-in PDF viewer, ensuring secure sandboxed page rendering.
          </li>
          <li>
            <strong>Tesseract.js:</strong> Port of Google&apos;s Tesseract OCR engine compiled to WebAssembly, running optical character recognition in isolated Web Workers.
          </li>
          <li>
            <strong>docx:</strong> Client-side OOXML library for generating Microsoft Word documents directly in the browser memory without cloud converters.
          </li>
          <li>
            <strong>Fabric.js:</strong> Interactive canvas layer for client-side digital signatures and text overlays.
          </li>
        </ul>

        <h2>4. Memory Sandbox &amp; File Lifecycle</h2>
        <p>
          When you select a file in LocalPDF:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--success-color)' }} /> 1. Sandboxed Read
            </div>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
              The file is read into an <code>ArrayBuffer</code> inside the browser tab&apos;s local memory space.
            </p>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--success-color)' }} /> 2. Local Computation
            </div>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
              Wasm and JavaScript modules perform byte modifications using your device&apos;s CPU and RAM.
            </p>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--success-color)' }} /> 3. Direct Download &amp; Cleanup
            </div>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
              The resulting <code>Blob</code> is saved to your downloads. Closing the tab immediately frees all memory.
            </p>
          </div>
        </div>

        <h2>5. Vulnerability Disclosure &amp; Security Contact</h2>
        <p>
          We welcome responsible security disclosures from developers and researchers. If you identify any potential security vulnerability, cross-site scripting vector, or privacy concern, please contact us directly:
        </p>
        <p style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '0.9rem' }}>
          Security Contact: <a href="mailto:tuyishime1angel@gmail.com" style={{ color: 'var(--primary-color)' }}>tuyishime1angel@gmail.com</a>
        </p>
        <p>
          We investigate all security reports promptly and acknowledge valid responsible disclosures.
        </p>
      </div>
    </div>
  );
}
