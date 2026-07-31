export const dynamic = 'force-static';

import Link from 'next/link';

export const metadata = {
  title: 'Compare PDF Tools – LocalPDF vs Competitors | LocalPDF',
  description: 'Honest feature, privacy, and pricing comparisons between LocalPDF and major PDF tool websites like iLovePDF, Smallpdf, and PDF24.',
  alternates: { canonical: 'https://www.uselocalpdf.com/compare' },
};

const comparisons = [
  {
    slug: 'localpdf-vs-ilovepdf',
    title: 'LocalPDF vs iLovePDF',
    summary: 'Both offer a full suite of PDF tools. LocalPDF processes files locally for maximum privacy; iLovePDF uploads files to its servers.',
  },
  {
    slug: 'localpdf-vs-smallpdf',
    title: 'LocalPDF vs Smallpdf',
    summary: 'Smallpdf has a polished UI and cloud storage integration. LocalPDF has no file size limits, no account required, and zero server uploads.',
  },
  {
    slug: 'localpdf-vs-pdf24',
    title: 'LocalPDF vs PDF24',
    summary: 'PDF24 offers the largest tool set in the market. LocalPDF competes with a privacy-first approach and browser-only processing for all operations.',
  },
];

export default function ComparePage() {
  return (
    <div className="blog-container">
      <div className="blog-header">
        <h1 className="blog-index-title">LocalPDF vs Competitors</h1>
        <p className="blog-index-subtitle">
          Honest, detailed comparisons between LocalPDF and the most popular PDF tool websites.
          Covering privacy practices, features, file limits, speed, and pricing.
        </p>
      </div>
      <div className="blog-grid">
        {comparisons.map((c) => (
          <Link key={c.slug} href={`/compare/${c.slug}`} className="blog-card">
            <div className="blog-card-category">Comparison</div>
            <h2 className="blog-card-title">{c.title}</h2>
            <p className="blog-card-desc">{c.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
