import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <Link href="/" className="footer-link">Home</Link>
        <Link href="/about" className="footer-link">About Us</Link>
        <Link href="/security" className="footer-link">Security &amp; Transparency</Link>
        <Link href="/contact" className="footer-link">Contact Us</Link>
        <a href="https://github.com/Tuyishimire-lab/Localpdf" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
        <Link href="/privacy" className="footer-link">Privacy Policy</Link>
        <Link href="/terms" className="footer-link">Terms of Service</Link>
      </div>
      <p className="footer-copyright">
        © {new Date().getFullYear()} <span>LocalPDF</span>. Built by Tuyishimire Angel in Kigali, Rwanda.
        All document processing runs 100% locally in your browser. Zero server uploads.
      </p>
    </footer>
  );
}

