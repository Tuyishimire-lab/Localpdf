export const metadata = {
  title: 'About Us | LocalPDF',
  description: 'Learn how LocalPDF operates 100% locally in your web browser using WebAssembly. Read about our mission to bring secure and free PDF editing to everyone.',
};

export default function AboutPage() {
  return (
    <div className="info-page-container">
      <h1 className="info-page-title">About LocalPDF</h1>
      <p className="info-page-subtitle">A secure, client-side approach to PDF productivity</p>

      <div className="info-page-content">
        <p>
          Welcome to <strong>LocalPDF</strong>, a suite of free, high-performance web utility tools designed to make working with PDF documents easy, fast, and, above all, <strong>secure</strong>.
        </p>

        <h2>Our Mission</h2>
        <p>
          Most online PDF converters and editors force you to upload your files to remote servers. If you are handling documents with sensitive information like tax forms, legal agreements, contracts, or personal records this poses a major privacy and security risk.
        </p>
        <p>
          Our mission is to eliminate that risk entirely. LocalPDF provides a set of complete, standard PDF utilities that run <strong>entirely inside your browser</strong>. Your documents never upload to a backend server.
        </p>

        <h2>How It Works</h2>
        <p>
          LocalPDF utilizes state-of-the-art web developments to perform complex document mutations on your computer's own hardware:
        </p>
        <ul>
          <li>
            <strong>WebAssembly (Wasm):</strong> We run high-performance compiled libraries directly in your browser tab. This enables fast compression, splitting, merging, and cryptographic operations.
          </li>
          <li>
            <strong>Client-Side Rendering:</strong> PDF pages are rendered directly into HTML5 canvas tags. When you view page previews, draw signatures, or add text watermarks, it happens in real-time on your screen.
          </li>
          <li>
            <strong>Local OCR:</strong> Optical Character Recognition is powered by client-side neural networks running in Web Workers, reading text from images locally.
          </li>
        </ul>

        <h2>Why Choose LocalPDF?</h2>
        <ul>
          <li><strong>100% Secure & Private:</strong> Since no file uploads occur, your private data can never be intercepted, cached, or leaked on a remote server.</li>
          <li><strong>Works Offline:</strong> Once the page is loaded, you can disconnect from the internet and continue editing, merging, or protecting your PDFs.</li>
          <li><strong>Instant Processing:</strong> You don't have to wait for slow uploads or downloads. Processing happens instantly, limited only by your device's speed.</li>
          <li><strong>No Limits:</strong> Merge, split, and edit as many files as you need, without subscribing or entering payment details.</li>
        </ul>

        <h2>Open and Secure</h2>
        <p>
          LocalPDF is built using open standards. We believe in transparency and security as the core foundation of our application. If you have any suggestions, feedback, or would like to request new features, feel free to visit our <a href="/contact" style={{ color: 'var(--primary-color)' }}>Contact Page</a>.
        </p>
      </div>
    </div>
  );
}
