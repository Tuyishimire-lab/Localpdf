/**
 * ToolContentSection – Server Component
 * Renders rich editorial content for a given tool:
 * description, how-to steps, features grid, FAQ accordion, and related tools links.
 *
 * This is a SERVER component (no 'use client') so all content is
 * present in the initial HTML source, fully crawlable by Googlebot.
 */
import Link from 'next/link';
import toolContent from '../data/toolContent';

const BASE_URL = 'https://www.uselocalpdf.com';

const TOOL_DIRECTORY = {
  compress: { title: 'Compress PDF', desc: 'QPDF lossless & image optimization', href: '/tools/compress' },
  merge: { title: 'Merge PDF', desc: 'Combine multiple PDFs locally', href: '/tools/merge' },
  split: { title: 'Split PDF', desc: 'Extract pages or ranges', href: '/tools/split' },
  'split-by-size': { title: 'Split by Size', desc: 'Chunk PDFs by MB or chapters', href: '/tools/split-by-size' },
  organize: { title: 'Organize PDF', desc: 'Reorder, delete & insert pages', href: '/tools/organize' },
  crop: { title: 'Crop PDF', desc: 'Trim margins via CropBox', href: '/tools/crop' },
  edit: { title: 'Edit PDF', desc: 'Add custom text overlays', href: '/tools/edit' },
  ocr: { title: 'OCR PDF', desc: 'Extract text & searchable PDFs', href: '/tools/ocr' },
  'pdf-to-jpg': { title: 'PDF to JPG', desc: 'Export pages as JPG or PNG', href: '/tools/pdf-to-jpg' },
  'jpg-to-pdf': { title: 'JPG to PDF', desc: 'Turn images into a PDF', href: '/tools/jpg-to-pdf' },
  sign: { title: 'Sign PDF', desc: 'Draw, type or upload signatures', href: '/tools/sign' },
  rotate: { title: 'Rotate PDF', desc: 'Fix page orientation permanently', href: '/tools/rotate' },
  watermark: { title: 'Watermark PDF', desc: 'Stamp text or image watermarks', href: '/tools/watermark' },
  'page-numbers': { title: 'Page Numbers', desc: 'Add customizable numbering', href: '/tools/page-numbers' },
  'bates-numbering': { title: 'Bates Numbering', desc: 'Sequential legal Bates stamping', href: '/tools/bates-numbering' },
  protect: { title: 'Protect PDF', desc: '256-bit AES encryption via QPDF', href: '/tools/protect' },
  unlock: { title: 'Unlock PDF', desc: 'Decrypt password-locked PDFs', href: '/tools/unlock' },
  redact: { title: 'Redact & Sanitize', desc: 'Black out sensitive content', href: '/tools/redact' },
  metadata: { title: 'Metadata Scrubber', desc: 'Inspect or strip hidden metadata', href: '/tools/metadata' },
  'ai-chat': { title: 'AI PDF Chat', desc: 'Local Q&A, summary & citations', href: '/tools/ai-chat' },
  'word-to-pdf': { title: 'Word/TXT to PDF', desc: 'Convert .docx & .txt locally', href: '/tools/word-to-pdf' },
  'pdf-to-word': { title: 'PDF to Word', desc: 'Convert PDFs to editable .docx', href: '/tools/pdf-to-word' },
  'pdf-to-excel': { title: 'PDF to Excel / CSV', desc: 'Extract PDF tables to .xlsx/.csv', href: '/tools/pdf-to-excel' },
  'extract-images': { title: 'Extract Images', desc: 'Export embedded images to PNG', href: '/tools/extract-images' },
  'fill-form': { title: 'Fill PDF Forms', desc: 'Fill AcroForms & flatten', href: '/tools/fill-form' },
  flatten: { title: 'Flatten PDF', desc: 'Bake forms & annotations static', href: '/tools/flatten' },
  compare: { title: 'Compare PDF', desc: 'Visual & text diff two PDFs', href: '/tools/compare' },
  repair: { title: 'Repair PDF', desc: 'Recover damaged xref & streams', href: '/tools/repair' },
  grayscale: { title: 'Grayscale PDF', desc: 'Monochrome print-ready conversion', href: '/tools/grayscale' },
  recipes: { title: 'PDF Recipes', desc: 'Automate multi-step pipelines', href: '/recipes' },
};

const RELATED_TOOLS_MAP = {
  compress: ['split-by-size', 'grayscale', 'protect', 'recipes'],
  merge: ['organize', 'bates-numbering', 'compress', 'recipes'],
  split: ['split-by-size', 'organize', 'merge', 'compress'],
  'split-by-size': ['compress', 'split', 'merge', 'grayscale'],
  organize: ['merge', 'split', 'crop', 'rotate'],
  crop: ['organize', 'grayscale', 'compress', 'recipes'],
  edit: ['sign', 'watermark', 'fill-form', 'flatten'],
  ocr: ['ai-chat', 'pdf-to-word', 'pdf-to-excel', 'redact'],
  'pdf-to-jpg': ['extract-images', 'jpg-to-pdf', 'compress', 'grayscale'],
  'jpg-to-pdf': ['compress', 'ocr', 'organize', 'protect'],
  sign: ['fill-form', 'flatten', 'protect', 'metadata'],
  rotate: ['organize', 'crop', 'compress', 'split'],
  watermark: ['bates-numbering', 'page-numbers', 'protect', 'recipes'],
  'page-numbers': ['bates-numbering', 'watermark', 'merge', 'compress'],
  'bates-numbering': ['metadata', 'redact', 'merge', 'recipes'],
  protect: ['metadata', 'redact', 'unlock', 'recipes'],
  unlock: ['protect', 'edit', 'pdf-to-word', 'metadata'],
  redact: ['metadata', 'flatten', 'bates-numbering', 'protect'],
  metadata: ['redact', 'protect', 'bates-numbering', 'recipes'],
  'ai-chat': ['ocr', 'compare', 'pdf-to-word', 'pdf-to-excel'],
  'word-to-pdf': ['compress', 'sign', 'protect', 'page-numbers'],
  'pdf-to-word': ['pdf-to-excel', 'ocr', 'ai-chat', 'unlock'],
  'pdf-to-excel': ['pdf-to-word', 'ocr', 'extract-images', 'ai-chat'],
  'extract-images': ['pdf-to-jpg', 'jpg-to-pdf', 'compress', 'pdf-to-excel'],
  'fill-form': ['flatten', 'sign', 'protect', 'metadata'],
  flatten: ['fill-form', 'redact', 'compress', 'protect'],
  compare: ['ai-chat', 'merge', 'redact', 'metadata'],
  repair: ['compress', 'organize', 'flatten', 'ocr'],
  grayscale: ['compress', 'crop', 'split-by-size', 'recipes'],
};

export default function ToolContentSection({ tool }) {
  const content = toolContent[tool];
  if (!content) return null;

  const { title, description, howTo, features, faqs } = content;
  const canonicalUrl = `${BASE_URL}/tools/${tool}`;

  // HowTo structured data for Google rich results
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to use ${title}`,
    description: description.split('\n\n')[0].trim(),
    step: howTo.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: step,
    })),
  };

  // SoftwareApplication structured data for tool search visibility
  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${title} — LocalPDF`,
    url: canonicalUrl,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any (Web Browser)',
    browserRequirements: 'Requires WebAssembly and JavaScript',
    description: description.split('\n\n')[0].trim(),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  // BreadcrumbList structured data
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: title, item: canonicalUrl },
    ],
  };

  const relatedKeys = RELATED_TOOLS_MAP[tool] || ['compress', 'merge', 'protect', 'recipes'];
  const relatedTools = relatedKeys.map((key) => TOOL_DIRECTORY[key]).filter(Boolean);

  return (
    <section className="tool-content-section" aria-label={`About ${title}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Description */}
      <div className="tool-content-description">
        <h2 className="tool-content-h2">About {title}</h2>
        {description.split('\n\n').map((para, i) => (
          <p key={i} className="tool-content-para">{para.trim()}</p>
        ))}
      </div>

      {/* How To */}
      <div className="tool-content-howto">
        <h2 className="tool-content-h2">How to Use</h2>
        <ol className="tool-content-steps">
          {howTo.map((step, i) => (
            <li key={i} className="tool-content-step">
              <span className="step-number">{i + 1}</span>
              <span className="step-text">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Features */}
      <div className="tool-content-features">
        <h2 className="tool-content-h2">Key Features</h2>
        <div className="tool-features-grid">
          {features.map((feature, i) => (
            <div key={i} className="tool-feature-card">
              <h3 className="tool-feature-title">{feature.title}</h3>
              <p className="tool-feature-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Related Tools Internal Linking */}
      {relatedTools.length > 0 && (
        <div className="tool-related-section">
          <h2 className="tool-content-h2">Related Client-Side PDF Tools</h2>
          <div className="tool-related-grid">
            {relatedTools.map((rel) => (
              <Link key={rel.href} href={rel.href} className="tool-related-card">
                <span className="tool-feature-title" style={{ display: 'block' }}>{rel.title}</span>
                <span className="tool-feature-desc">{rel.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* FAQ with FAQPage schema */}
      <div
        className="tool-content-faq"
        itemScope
        itemType="https://schema.org/FAQPage"
      >
        <h2 className="tool-content-h2">Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqs.map((faq, i) => (
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
  );
}
