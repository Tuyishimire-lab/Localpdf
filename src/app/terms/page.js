export const metadata = {
  title: 'Terms of Service | LocalPDF',
  description: 'Terms of Service for LocalPDF. Review our terms of use for client-side PDF document manipulation tools.',
};

export default function TermsPage() {
  return (
    <div className="info-page-container">
      <h1 className="info-page-title">Terms of Service</h1>
      <p className="info-page-subtitle">Last updated: July 21, 2026</p>

      <div className="info-page-content">
        <h2>1. Terms</h2>
        <p>
          By accessing the website at LocalPDF, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this website are protected by applicable copyright and trademark law.
        </p>

        <h2>2. Use License</h2>
        <p>
          Permission is granted to use the client-side tools on LocalPDF's website for personal or commercial usage. Under this license you may:
        </p>
        <ul>
          <li>Use any tool (Merge, Compress, Split, OCR, Edit, Protect, Sign, etc.) to process your files.</li>
          <li>Integrate the output files into your personal or commercial workflows.</li>
        </ul>
        <p>
          However, this license does not permit you to:
        </p>
        <ul>
          <li>Modify or copy the codebase of LocalPDF for redistributive commercial purposes without proper attribution or permission.</li>
          <li>Use the materials or backend services (if any) for any commercial purpose, or for any public display (commercial or non-commercial) without consent.</li>
          <li>Attempt to decompile or reverse engineer any software contained on LocalPDF's website.</li>
          <li>Remove any copyright or other proprietary notations from the materials.</li>
          <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
        </ul>
        <p>
          This license shall automatically terminate if you violate any of these restrictions and may be terminated by LocalPDF at any time.
        </p>

        <h2>3. Disclaimer</h2>
        <p>
          The materials on LocalPDF's website are provided on an 'as is' basis. LocalPDF makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
        </p>
        <p>
          Further, LocalPDF does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the materials on its website or otherwise relating to such materials or on any sites linked to this site.
        </p>

        <h2>4. Limitations of Liability</h2>
        <p>
          In no event shall LocalPDF or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials or tools on LocalPDF's website, even if LocalPDF or a LocalPDF authorized representative has been notified orally or in writing of the possibility of such damage. 
          Because all document processing takes place directly on your browser client-side, <strong>you maintain full custody and responsibility for the inputs and outputs of your document processing activities.</strong>
        </p>

        <h2>5. Accuracy of Materials</h2>
        <p>
          The materials appearing on LocalPDF's website could include technical, typographical, or photographic errors. LocalPDF does not warrant that any of the materials on its website are accurate, complete or current. LocalPDF may make changes to the materials contained on its website at any time without notice. However LocalPDF does not make any commitment to update the materials.
        </p>

        <h2>6. Links</h2>
        <p>
          LocalPDF has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by LocalPDF of the site. Use of any such linked website is at the user's own risk.
        </p>

        <h2>7. Modifications</h2>
        <p>
          LocalPDF may revise these terms of service for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.
        </p>

        <h2>8. Governing Law</h2>
        <p>
          These terms and conditions are governed by and construed in accordance with standard international web regulations and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
        </p>
      </div>
    </div>
  );
}
