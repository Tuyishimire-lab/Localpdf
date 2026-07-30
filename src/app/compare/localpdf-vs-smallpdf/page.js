import Link from 'next/link';
import { ArrowLeft, Check, X } from 'lucide-react';

export const metadata = {
  title: 'LocalPDF vs Smallpdf – Privacy, Features & Pricing Comparison',
  description: 'Compare LocalPDF and Smallpdf: privacy practices, file upload policies, tool features, pricing tiers, and processing approach.',
  alternates: { canonical: 'https://www.uselocalpdf.com/compare/localpdf-vs-smallpdf' },
};

const rows = [
  // Architecture & Privacy
  { feature: 'File processing', localpdf: 'In your browser', competitor: 'Uploaded to servers', note: 'Core difference', highlight: true },
  { feature: 'Files leave your device', localpdf: false, competitor: true, note: 'LocalPDF: never' },
  { feature: 'Works offline', localpdf: true, competitor: false, note: 'After first page load' },
  // Limits & Cost
  { feature: 'Always free', localpdf: true, competitor: false, note: 'Smallpdf: paid plan required for heavy use' },
  { feature: 'Free daily task limit', localpdf: 'None', competitor: '2 tasks/day', note: 'Major restriction' },
  { feature: 'File size limit (free)', localpdf: 'None', competitor: '15 MB', note: 'Smallest limit in category' },
  { feature: 'Account required', localpdf: false, competitor: 'Optional', note: null },
  { feature: 'Cloud storage integration', localpdf: false, competitor: true, note: 'Drive, Dropbox, OneDrive' },
  // Tools
  { feature: 'Compress / Merge / Split', localpdf: true, competitor: true, note: 'LocalPDF: instant, no upload' },
  { feature: 'Sign PDF', localpdf: true, competitor: true, note: null },
  { feature: 'OCR', localpdf: true, competitor: true, note: 'LocalPDF: offline via Tesseract.js' },
  { feature: 'PDF to Word', localpdf: true, competitor: true, note: null },
  { feature: 'Flatten PDF', localpdf: true, competitor: false, note: null },
  { feature: 'Repair PDF', localpdf: true, competitor: false, note: null },
  { feature: 'Compare PDF (visual diff)', localpdf: true, competitor: false, note: null },
  { feature: 'Processing History', localpdf: true, competitor: 'Account only', note: 'LocalPDF: stored locally' },
];

function Cell({ value }) {
  if (value === true) return <td className="compare-cell"><Check size={18} style={{ color: 'var(--success-color)' }} /></td>;
  if (value === false) return <td className="compare-cell"><X size={18} style={{ color: 'var(--error-color)' }} /></td>;
  return <td className="compare-cell compare-cell-text">{value}</td>;
}

export default function VsSmallpdf() {
  return (
    <div className="blog-post-container">
      <Link href="/compare" className="blog-back-link"><ArrowLeft size={16} /> All Comparisons</Link>
      <div className="blog-post-header">
        <div className="blog-card-category">Comparison</div>
        <h1 className="blog-post-title">LocalPDF vs Smallpdf</h1>
        <p className="blog-index-subtitle">Comparing privacy approach, free tier restrictions, features, and speed.</p>
      </div>

      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th style={{ width: '38%' }}>Feature</th>
              <th className="compare-th-brand" style={{ width: '20%' }}>LocalPDF</th>
              <th style={{ width: '20%' }}>Smallpdf</th>
              <th style={{ width: '22%', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={row.highlight ? { background: 'rgba(255,71,87,0.06)' } : {}}>
                <td className="compare-feature-cell" style={row.highlight ? { fontWeight: 700, color: 'var(--text-main)' } : {}}>{row.feature}</td>
                <Cell value={row.localpdf} />
                <Cell value={row.competitor} />
                <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.65rem 0.75rem' }}>{row.note || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <article className="blog-post-content">
        <h2>Free Tier Restrictions</h2>
        <p>Smallpdf's free tier is the most restrictive among major PDF services: 2 tasks per day and a 15 MB file size limit. This makes it impractical for anyone with moderate PDF processing needs. LocalPDF imposes no task limit and no file size restriction on any operation.</p>

        <h2>Privacy</h2>
        <p>Like all major PDF tool services, Smallpdf uploads your files to their servers for processing. They are based in Switzerland and comply with Swiss and EU privacy laws. However, any server-based service involves trusting a third party with your document content. LocalPDF's browser-based processing eliminates this trust requirement entirely.</p>

        <h2>Cloud Integration vs Privacy</h2>
        <p>Smallpdf integrates with Google Drive, Dropbox, and OneDrive, which is convenient for users who already store documents in the cloud. LocalPDF does not offer cloud integration by design, since cloud integration implies uploading your documents to external services, which conflicts with the privacy-first approach.</p>

        <h2>Tool Coverage</h2>
        <p>Smallpdf covers core PDF operations well. LocalPDF additionally offers Flatten PDF, Repair PDF, and Compare PDF, tools that Smallpdf does not provide. For the vast majority of everyday PDF tasks, both services have everything needed.</p>

        <h2>Verdict</h2>
        <p>Smallpdf suits users who need cloud storage integration and do not mind the 2-task daily limit for occasional use. LocalPDF suits users who need unlimited free access, work with sensitive documents, or process more than a couple of PDFs per day.</p>
      </article>

      <div className="blog-post-footer">
        <Link href="/tools/compress" className="btn-primary" style={{ display: 'inline-flex' }}>Try LocalPDF Free →</Link>
      </div>
    </div>
  );
}
