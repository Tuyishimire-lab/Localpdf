/**
 * HomeEditorialSection – Server Component
 * Renders the "Why LocalPDF is Different", How-To, and FAQ sections
 * for the homepage. No 'use client' — content is in the initial HTML
 * response and fully crawlable by Googlebot on first pass.
 */
export default function HomeEditorialSection() {
  return (
    <section className="home-editorial-section" aria-label="About LocalPDF">
      <div className="home-editorial-lead">
        <h2 className="home-editorial-title">Why LocalPDF is Different</h2>
        <p className="home-editorial-intro">
          Most online PDF tools upload your files to remote servers for processing. LocalPDF takes a fundamentally different approach: every single operation (compression, merging, splitting, OCR, signing, converting) runs entirely inside your web browser using WebAssembly and modern JavaScript APIs. Your documents never leave your device.
        </p>
      </div>

      <div className="home-why-grid">
        <div className="home-why-card">
          <span className="home-why-icon">🔒</span>
          <h3 className="home-why-title">Zero Server Uploads</h3>
          <p className="home-why-desc">Your PDF files are processed entirely on your device. No file is ever transmitted to any server, not ours, not anyone&apos;s. What you edit stays on your computer.</p>
        </div>
        <div className="home-why-card">
          <span className="home-why-icon">⚡</span>
          <h3 className="home-why-title">Instant Processing</h3>
          <p className="home-why-desc">There are no upload queues or server wait times. Processing begins the moment you click, limited only by your device&apos;s own speed, which for most tasks is near-instant.</p>
        </div>
        <div className="home-why-card">
          <span className="home-why-icon">📶</span>
          <h3 className="home-why-title">Works Offline</h3>
          <p className="home-why-desc">Once the page has loaded, you can disconnect from the internet and continue using all tools. Compress, merge, sign, or convert PDFs with no active connection required.</p>
        </div>
        <div className="home-why-card">
          <span className="home-why-icon">🆓</span>
          <h3 className="home-why-title">Completely Free</h3>
          <p className="home-why-desc">Every tool is free to use without subscription, account creation, or file size restrictions. No watermarks are added to your output files.</p>
        </div>
      </div>

      <div className="home-how-section">
        <h2 className="home-how-title">How LocalPDF Works</h2>
        <div className="home-how-steps">
          <div className="home-how-step">
            <h3 className="home-how-step-title">Select a Tool</h3>
            <p className="home-how-step-desc">Choose from 15 specialized PDF tools: merge, split, compress, OCR, sign, convert, and more.</p>
          </div>
          <div className="home-how-step">
            <h3 className="home-how-step-title">Upload Your File</h3>
            <p className="home-how-step-desc">Drop your PDF (or images) into the tool. The file is loaded into your browser&apos;s memory and goes nowhere else.</p>
          </div>
          <div className="home-how-step">
            <h3 className="home-how-step-title">Configure &amp; Process</h3>
            <p className="home-how-step-desc">Adjust settings for your task and click the action button. WebAssembly libraries process the document locally at native speed.</p>
          </div>
          <div className="home-how-step">
            <h3 className="home-how-step-title">Download the Result</h3>
            <p className="home-how-step-desc">Your processed file is saved directly to your device. No sign-in, no email required, no waiting.</p>
          </div>
        </div>
      </div>

      <div
        className="home-faq-section"
        itemScope
        itemType="https://schema.org/FAQPage"
      >
        <h2 className="home-faq-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          <details
            className="faq-item"
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <summary className="faq-question" itemProp="name">Are LocalPDF tools really free with no catch?</summary>
            <div className="faq-answer" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
              <p itemProp="text">Yes. All 15 tools are completely free with no subscription, no file size limits, no watermarks on output files, and no account required. The site is supported by non-intrusive advertising that does not affect your document processing.</p>
            </div>
          </details>
          <details
            className="faq-item"
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <summary className="faq-question" itemProp="name">What does &quot;client-side processing&quot; mean for my privacy?</summary>
            <div className="faq-answer" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
              <p itemProp="text">Client-side processing means all computation happens on your own device (client) rather than on a remote server. When you compress or merge a PDF, the bytes of your document never travel over the internet. They are read from your local file system, processed in the browser&apos;s sandboxed memory, and saved back to your downloads folder as a completely local round-trip.</p>
            </div>
          </details>
          <details
            className="faq-item"
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <summary className="faq-question" itemProp="name">What types of files can I work with?</summary>
            <div className="faq-answer" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
              <p itemProp="text">LocalPDF supports PDF documents for all primary tools. Additional formats supported include JPEG, PNG, and WebP images (for JPG to PDF conversion), Microsoft Word .docx files, plain text .txt files, and Markdown .md files (for Word-to-PDF conversion).</p>
            </div>
          </details>
          <details
            className="faq-item"
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <summary className="faq-question" itemProp="name">Does LocalPDF work on mobile devices and tablets?</summary>
            <div className="faq-answer" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
              <p itemProp="text">Yes. LocalPDF is fully responsive and works in modern mobile browsers on iOS and Android. All tools function on phones and tablets, though a desktop or laptop provides a more comfortable editing experience for tasks like signing or organizing pages.</p>
            </div>
          </details>
          <details
            className="faq-item"
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <summary className="faq-question" itemProp="name">Can I use LocalPDF for commercial or professional documents?</summary>
            <div className="faq-answer" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
              <p itemProp="text">Absolutely. LocalPDF is suitable for professional use including contracts, financial reports, legal documents, medical records, and business communications. Because processing is local, there is no data exposure risk, which is a key requirement when handling confidential business material.</p>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
