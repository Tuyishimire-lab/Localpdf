export const dynamic = 'force-static';

import { buildPageMetadata } from '../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Terms of Service | LocalPDF',
  description: 'Terms of Service for LocalPDF. Review our terms of use for client-side PDF document manipulation tools.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <div className="info-page-container">
      <h1 className="info-page-title">Terms of Service</h1>
      <p className="info-page-subtitle">Last updated: August 25, 2026</p>

      <div className="info-page-content">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using <strong>LocalPDF</strong> (the &quot;Service&quot;), available at{' '}
          <a href="https://www.uselocalpdf.com" style={{ color: 'var(--primary-color)' }}>
            www.uselocalpdf.com
          </a>
          , you agree to be bound by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy. If you do not agree with any part of these Terms, please do not use the Service.
        </p>

        <h2>2. Description of Service &amp; Client-Side Operation</h2>
        <p>
          LocalPDF provides free, in-browser document productivity utilities (including tools for merging, splitting, compressing, editing, signing, OCR, rotating, watermarking, flattening, comparing, repairing, and converting PDF files).
        </p>
        <p>
          The Service operates entirely within your web browser using client-side JavaScript, HTML5 Canvas APIs, and WebAssembly. Your documents, files, and outputs are processed locally on your device and are never uploaded, hosted, or transmitted to any server operated by LocalPDF.
        </p>

        <h2>3. User Custody &amp; Document Ownership</h2>
        <ul>
          <li>
            <strong>Your Ownership &amp; Intellectual Property:</strong> You retain complete ownership, copyright, title, and all intellectual property rights in and to all documents and files processed using the Service. LocalPDF claims zero ownership, license, custody, or access rights over your documents.
          </li>
          <li>
            <strong>Your Responsibility:</strong> You are solely responsible for ensuring that you have the legal right, authorization, and permission to upload, process, modify, decrypt, redact, or sign any documents you input into the Service.
          </li>
          <li>
            <strong>Authorization for Decryption:</strong> When using tools such as Unlock PDF, you represent and warrant that you are either the legitimate owner of the document or have explicit authorization from the rights holder to remove document security restrictions.
          </li>
        </ul>

        <h2>4. Permitted Use &amp; License</h2>
        <p>
          You are granted a worldwide, non-exclusive, revocable, royalty-free license to use LocalPDF for both personal and commercial document workflows.
        </p>
        <p>
          Under this license, you agree not to:
        </p>
        <ul>
          <li>Use the Service in any manner that impairs, overwhelms, or compromises the availability or performance of the website for other users.</li>
          <li>Attempt to distribute malicious code, automated scraping that degrades service availability, or disrupt website infrastructure.</li>
          <li>Misrepresent your identity or claim unauthorized endorsement or affiliation with LocalPDF.</li>
        </ul>
        <p>
          LocalPDF is built using open web standards and respected open-source libraries (including pdf-lib, pdfjs-dist, Tesseract.js, docx, and Fabric.js). We encourage transparency and respect open-source licensing principles.
        </p>

        <h2>5. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE AND ALL DOCUMENT TOOLS ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
        </p>
        <p>
          While we strive for high precision and performance, client-side PDF manipulation (such as complex layout conversion, optical character recognition accuracy, or corrupted file recovery) is subject to source document characteristics and browser environment capabilities. We strongly advise you to always retain backup copies of your original documents before performing any modifications.
        </p>

        <h2>6. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL LOCALPDF, ITS OPERATORS, CONTRIBUTORS, OR AFFILIATES BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF PROFITS, BUSINESS INTERRUPTION, OR INACCURATE DOCUMENT PROCESSING, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OR INABILITY TO USE THE SERVICE.
        </p>

        <h2>7. Governing Law &amp; Jurisdiction</h2>
        <p>
          These Terms of Service, and any claim or dispute arising out of or related to your use of LocalPDF, shall be governed by and construed in accordance with the laws of <strong>Rwanda</strong>, without giving effect to any principles of conflicts of law.
        </p>
        <p>
          You agree that any legal action, dispute, or proceeding shall be resolved through good-faith negotiation or brought before the competent courts situated in <strong>Kigali, Rwanda</strong>.
        </p>

        <h2>8. Modifications to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. When changes are made, we will update the &quot;Last updated&quot; date at the top of this page. Your continued use of the Service after any modifications constitutes your acceptance of the revised Terms.
        </p>

        <h2>9. Contact Us</h2>
        <p>
          If you have questions, feedback, or concerns regarding these Terms of Service, please reach out to us at:{' '}
          <a href="mailto:tuyishime1angel@gmail.com" style={{ color: 'var(--primary-color)' }}>
            tuyishime1angel@gmail.com
          </a>{' '}
          or visit our <a href="/contact" style={{ color: 'var(--primary-color)' }}>Contact Page</a>.
        </p>
      </div>
    </div>
  );
}
