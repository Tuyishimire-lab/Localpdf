export const dynamic = 'force-static';

import Link from 'next/link';
import ClientPage from './ClientPage';
import { buildPageMetadata, SITE_URL } from '../../lib/seo';

const DESCRIPTION =
  'Build, save, and run multi-step local PDF workflows like Merge → Bates Number → Watermark → Compress → AES-256 Encrypt without leaving your browser.';

export const metadata = buildPageMetadata({
  title: 'PDF Recipes & Multi-Step Pipelines | LocalPDF',
  description: DESCRIPTION,
  path: '/recipes',
  ogAlt: 'LocalPDF Multi-Step PDF Recipes',
});

const RECIPES_FAQS = [
  {
    q: 'What are PDF Recipes and how do they run locally?',
    a: 'PDF Recipes let you chain multiple LocalPDF operations—such as Merge, Crop, Bates Numbering, Watermark, Page Numbers, Metadata Scrubbing, Flattening, QPDF Lossless Compression, and 256-bit AES Encryption—into one sequential in-browser pipeline using WebAssembly and JavaScript without uploading files.',
  },
  {
    q: 'Where are custom saved PDF Recipes stored?',
    a: 'Custom pipelines are stored strictly inside your own browser localStorage under the localpdf_recipes key. Nothing is synced to a server or account.',
  },
  {
    q: 'Can I use PDF Recipes offline or in Strict Air-Gapped Mode?',
    a: 'Yes. Because every step runs client-side with bundled assets and QPDF WebAssembly, PDF Recipes work offline after initial page load and under Strict Air-Gapped Mode.',
  },
  {
    q: 'What is included in the Legal Discovery Pack and Confidential Client Share presets?',
    a: 'Legal Discovery Pack combines Merge -> Bates Numbering -> Scrub Metadata -> Lossless Compress. Confidential Client Share applies a Watermark -> Scrub Metadata -> Lossless Compress -> 256-bit AES Encryption.',
  },
];

export default function RecipesPage() {
  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'LocalPDF PDF Recipes & Multi-Step Pipelines',
    url: `${SITE_URL}/recipes`,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any (Web Browser)',
    browserRequirements: 'Requires WebAssembly and JavaScript',
    description: DESCRIPTION,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'PDF Recipes', item: `${SITE_URL}/recipes` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ClientPage />
      <section className="tool-content-section" aria-label="About PDF Recipes">
        <div className="tool-content-description">
          <h2 className="tool-content-h2">
            Automate Repeated PDF Tasks Without Cloud Uploads
          </h2>
          <p className="tool-content-para">
            <strong>PDF Recipes</strong> let you chain multiple LocalPDF engines in a single in-memory pass—combine multiple exhibits, trim CropBox margins, apply Bates numbering, stamp confidential watermarks, scrub identifying metadata, compress with QPDF WebAssembly, and lock with 256-bit AES encryption.
          </p>
          <p className="tool-content-para">
            Custom pipelines are saved locally in your browser&apos;s <code>localStorage</code> and execute completely offline after initial load.
          </p>
        </div>

        <div className="tool-related-section">
          <h2 className="tool-content-h2">Individual Tools Used Inside Recipes</h2>
          <div className="tool-related-grid">
            <Link href="/tools/bates-numbering" className="tool-related-card">
              <span className="tool-feature-title" style={{ display: 'block' }}>Bates Numbering</span>
              <span className="tool-feature-desc">Sequential legal IDs &amp; headers</span>
            </Link>
            <Link href="/tools/metadata" className="tool-related-card">
              <span className="tool-feature-title" style={{ display: 'block' }}>Metadata Scrubber</span>
              <span className="tool-feature-desc">Wipe author, creator &amp; timestamps</span>
            </Link>
            <Link href="/tools/compress" className="tool-related-card">
              <span className="tool-feature-title" style={{ display: 'block' }}>Compress PDF</span>
              <span className="tool-feature-desc">QPDF lossless stream optimization</span>
            </Link>
            <Link href="/tools/protect" className="tool-related-card">
              <span className="tool-feature-title" style={{ display: 'block' }}>Protect PDF</span>
              <span className="tool-feature-desc">256-bit AES password locking</span>
            </Link>
          </div>
        </div>

        <div
          className="tool-content-faq"
          itemScope
          itemType="https://schema.org/FAQPage"
        >
          <h2 className="tool-content-h2">Frequently Asked Questions</h2>
          <div className="faq-list">
            {RECIPES_FAQS.map((faq, i) => (
              <details
                key={i}
                className="faq-item"
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <summary className="faq-question" itemProp="name">
                  {faq.q}
                </summary>
                <div
                  className="faq-answer"
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                >
                  <p itemProp="text">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
