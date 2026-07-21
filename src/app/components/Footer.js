import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <Link href="/" className="footer-link">Home</Link>
        <Link href="/about" className="footer-link">About Us</Link>
        <Link href="/contact" className="footer-link">Contact Us</Link>
        <Link href="/privacy" className="footer-link">Privacy Policy</Link>
        <Link href="/terms" className="footer-link">Terms of Service</Link>
      </div>
      <p className="footer-copyright">
        © {new Date().getFullYear()} <span>LocalPDF</span>. 
        All files are processed locally in your browser. No files are uploaded to any server.
      </p>
    </footer>
  );
}

