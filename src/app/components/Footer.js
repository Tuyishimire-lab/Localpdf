export default function Footer() {
  return (
    <footer className="footer">
      <p>
        © {new Date().getFullYear()} <span>LocalPDF</span>. 
        All files are processed locally in your browser. No files are uploaded to any server.
      </p>
    </footer>
  );
}
