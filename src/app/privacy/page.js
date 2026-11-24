export const dynamic = 'force-static';

import { buildPageMetadata } from '../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Privacy Policy | LocalPDF',
  description: 'Learn about our commitment to privacy. LocalPDF executes all PDF operations 100% locally in your web browser. No documents are ever uploaded to any server.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <div className="info-page-container">
      <h1 className="info-page-title">Privacy Policy</h1>
      <p className="info-page-subtitle">Last updated: August 25, 2026</p>

      <div className="info-page-content">
        <p>
          At <strong>LocalPDF</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), accessible at{' '}
          <a href="https://www.uselocalpdf.com" style={{ color: 'var(--primary-color)' }}>
            www.uselocalpdf.com
          </a>
          , we believe that data privacy is a fundamental right. This Privacy Policy details our data practices, our client-side architecture, and your privacy rights.
        </p>

        <h2>1. Data Controller &amp; Contact Information</h2>
        <p>
          The data controller responsible for this website is <strong>Tuyishimire Angel</strong> (operator of LocalPDF), based in Kigali, Rwanda.
        </p>
        <p>
          If you have any questions regarding this Privacy Policy, your personal data, or our privacy practices, please contact us at:{' '}
          <a href="mailto:tuyishime1angel@gmail.com" style={{ color: 'var(--primary-color)' }}>
            tuyishime1angel@gmail.com
          </a>{' '}
          or via our <a href="/contact" style={{ color: 'var(--primary-color)' }}>Contact Page</a>.
        </p>

        <h2>2. Zero-Upload Architecture: Complete Document Privacy</h2>
        <p>
          The core foundation of LocalPDF is our <strong>100% client-side architecture</strong>. Unlike conventional online PDF converters that transfer your documents to remote cloud servers for processing:
        </p>
        <ul>
          <li>
            <strong>Your files never leave your device:</strong> All document tasks (including merging, splitting, compressing, OCR text extraction, e-signing, redacting, watermark stamping, format conversion, and local AI chat) execute strictly within your web browser&apos;s sandboxed memory using WebAssembly and client-side JavaScript.
          </li>
          <li>
            <strong>Zero server storage or transit:</strong> No PDF content, scanned images, form data, passwords, or document metadata are ever uploaded to our servers or any third-party infrastructure.
          </li>
          <li>
            <strong>No data breach exposure:</strong> Because we never receive or host your document data, it is technically impossible for your files to be intercepted, leaked, or breached on our systems.
          </li>
        </ul>

        <h2>3. Information We Collect and Process</h2>

        <h3>A. Local Browser Storage</h3>
        <p>
          To provide convenient features such as theme preferences and your recent file processing history, LocalPDF stores data locally on your device via HTML5 <code>localStorage</code>:
        </p>
        <ul>
          <li><strong>Theme Preference (<code>localpdf_theme</code>):</strong> Remembers your light/dark mode selection.</li>
          <li><strong>Processing History (<code>localpdf_history</code>):</strong> Keeps a local record of recent tool operations (file name, file size, timestamp). This data remains strictly in your browser and is never transmitted to us. You can clear your history at any time using the Clear History button or your browser settings.</li>
          <li><strong>Cookie Consent Choice (<code>localpdf-cookie-consent</code>):</strong> Stores whether you accepted or declined optional analytics cookies.</li>
          <li><strong>PWA Prompt Dismissal (<code>localpdf-pwa-prompt-dismissed</code>):</strong> Remembers if you dismissed the offline app install prompt.</li>
          <li><strong>Strict Air-Gapped Mode (<code>localpdf_airgapped</code>):</strong> Stores your opt-in Strict Air-Gapped Mode preference, which forcefully disables optional analytics and blocks non-local OCR language CDN fetches.</li>
          <li><strong>Saved PDF Recipes (<code>localpdf_recipes</code>):</strong> Stores custom multi-step PDF workflow pipelines you create and save locally in the Recipes builder.</li>
        </ul>

        <h3>B. Contact Form &amp; Support Inquiries</h3>
        <p>
          If you voluntarily reach out to us through our contact form or via email, we collect your name, email address, subject, and the message content you provide. We use this information solely to respond to your inquiry and provide user support. We never sell, rent, or trade your contact information.
        </p>

        <h3>C. Aggregated Web Analytics</h3>
        <p>
          Only after you explicitly accept cookies via our consent banner, we use privacy-conscious analytics tools (such as Google Analytics and Vercel Analytics) to evaluate reliability and performance. If you decline, no analytics scripts are loaded. When enabled, these services record non-personally identifiable technical telemetry, including:
        </p>
        <ul>
          <li>Browser type, operating system, and device category</li>
          <li>Pages visited, referring websites, and timestamps</li>
          <li>General geographic region (country or city level, with IP anonymization enabled)</li>
        </ul>
        <p>
          This telemetry is aggregated and cannot be used to identify you personally or access any document you process.
        </p>

        <h2>4. Cookies &amp; Optional Advertising</h2>
        <p>
          LocalPDF currently operates without third-party behavioral ad trackers loaded by default. If optional third-party advertising networks (such as Google AdSense) are enabled in the future, they would only load with explicit user consent. You may manage or opt out of personalized advertising by visiting{' '}
          <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>
            Google Ads Settings
          </a>{' '}
          or by configuring cookie controls in your browser settings.
        </p>

        <h2>5. Your Rights Under GDPR (EU &amp; UK Users)</h2>
        <p>
          If you reside in the European Economic Area (EEA) or the United Kingdom, you have rights under the General Data Protection Regulation (GDPR). In accordance with GDPR Article 12(5), <strong>exercising your rights is completely free of charge</strong>:
        </p>
        <ul>
          <li><strong>Right of Access:</strong> You have the right to request information regarding any personal data we hold about you.</li>
          <li><strong>Right to Rectification:</strong> You have the right to request correction of inaccurate or incomplete personal data.</li>
          <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> You have the right to request the deletion of your personal data (e.g., support emails).</li>
          <li><strong>Right to Restriction of Processing:</strong> You have the right to request limits on how we process your personal data.</li>
          <li><strong>Right to Data Portability:</strong> You have the right to receive your personal data in a structured, commonly used format.</li>
          <li><strong>Right to Object:</strong> You have the right to object to the processing of your personal data.</li>
        </ul>
        <p>
          <em>Note on document data:</em> Because all document processing is executed locally on your machine and we never collect, store, or receive your documents, we hold no document records to provide or delete.
        </p>
        <p>
          To exercise any of your data protection rights, please contact us at{' '}
          <a href="mailto:tuyishime1angel@gmail.com" style={{ color: 'var(--primary-color)' }}>
            tuyishime1angel@gmail.com
          </a>
          . We will respond within 30 days.
        </p>

        <h2>6. California Privacy Rights (CCPA / CPRA)</h2>
        <p>
          Under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA), California residents are entitled to know what personal information is collected, request deletion, and opt out of any sale of personal information.
        </p>
        <p>
          <strong>We do not sell, rent, or share personal data or document content to third parties for monetary or commercial consideration.</strong>
        </p>

        <h2>7. Children&apos;s Privacy</h2>
        <p>
          LocalPDF does not knowingly collect or solicit personal identifiable information from children under the age of 13. If you believe that a child has provided us with personal information through our contact form, please notify us immediately and we will promptly delete such records.
        </p>

        <h2>8. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect technological improvements, legal requirements, or operational changes. Any updates will be posted on this page with an updated revision date.
        </p>
      </div>
    </div>
  );
}
