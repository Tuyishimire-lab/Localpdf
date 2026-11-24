# LocalPDF

> **100% private, client-side PDF tools — your files never leave your browser.**

LocalPDF is a free, open-source suite of 29 PDF utilities built entirely in Next.js.
All processing happens in-browser via WebAssembly and JavaScript libraries. No server uploads, no accounts, no API keys required.

🌐 **Live site:** [uselocalpdf.com](https://www.uselocalpdf.com)

---

## Features

| Tool | Description |
|---|---|
| **Organize PDF** | Delete, reorder, duplicate, rotate, or insert blank pages visually |
| **Merge PDF** | Combine multiple PDFs into one, in any order |
| **Split PDF** | Extract page ranges or split every page into a separate file |
| **Compress PDF** | Reduce file size by optimizing images client-side |
| **Edit PDF** | Add and position custom text overlays on pages |
| **OCR PDF** | Extract text from scanned PDFs using local Tesseract.js |
| **PDF to JPG** | Export every page as a high-quality JPG or PNG |
| **JPG to PDF** | Convert images (JPG, PNG, WebP) to PDF with custom layouts |
| **Sign PDF** | Draw, type, or upload a signature and stamp it on any page |
| **Rotate PDF** | Rotate individual pages or the entire document |
| **Watermark** | Stamp text or image watermarks with adjustable opacity and angle |
| **Page Numbers** | Add customizable page numbers to any PDF |
| **Protect PDF** | Encrypt with owner/user passwords |
| **Unlock PDF** | Remove password protection from PDFs |
| **Redact & Sanitize** | Permanently black out sensitive text and strip metadata |
| **AI PDF Summarizer & Chat** | TF-IDF-powered local Q&A, OCR fallback, document categorisation |
| **Word/TXT to PDF** | Convert `.docx` and `.txt` files to PDF entirely in-browser |
| **PDF to Word** | Convert PDFs to editable `.docx` documents |
| **Flatten PDF** | Convert form fields and annotations to static content |
| **Compare PDF** | Side-by-side visual & text diff of two PDFs + downloadable HTML report |
| **Repair PDF** | QPDF WebAssembly structural recovery of corrupted PDF files |
| **PDF to Excel / CSV** | Extract PDF tables into `.xlsx` workbooks or `.csv` files locally |
| **Crop PDF** | Visual CropBox margin trimmer across pages and rotations |
| **Extract Images** | Save embedded raster images from PDFs as lossless PNGs or ZIP |
| **Fill PDF Forms** | Complete interactive AcroForm fields, checkboxes, and dropdowns |
| **Metadata & Scrubber** | Inspect, edit, or strip identifying PDF metadata fields |
| **Bates Numbering** | Continuous legal Bates stamping and custom headers/footers |
| **Split by Size / Bookmarks** | Split PDFs into MB limits or automatic bookmark chapters |
| **Grayscale PDF** | Monochrome print-ready PDF conversion with contrast tuning |
| **PDF Recipes (`/recipes`)** | Build, save & run reusable multi-step pipelines (Merge → Bates → Watermark → Compress → AES-256) |

### Platform & Privacy Highlights
- **Strict Air-Gapped Mode**: Global switch (`localpdf_airgapped`) inside every privacy verification badge to suppress optional analytics and block external OCR CDN packs.
- **PWA File Handling API**: Installed desktop PWA opens `.pdf` files directly from the OS via `window.launchQueue`.
- **Opt-in Local WebGPU / On-Device AI**: Enhanced local synthesis and Chrome/Edge `LanguageModel` support in AI PDF Chat alongside zero-download TF-IDF.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| PDF manipulation | [pdf-lib](https://pdf-lib.js.org) + [@neslinesli93/qpdf-wasm](https://www.npmjs.com/package/@neslinesli93/qpdf-wasm) |
| PDF rendering / parsing | [pdfjs-dist](https://mozilla.github.io/pdf.js/) |
| OCR | [Tesseract.js](https://tesseract.projectnaptha.com/) |
| Canvas editing | [Fabric.js](http://fabricjs.com/) |
| Word document export | [docx](https://docx.js.org/) |
| Analytics | Consent-gated [@vercel/analytics](https://vercel.com/analytics) + optional GA4 |
| Icons | [lucide-react](https://lucide.dev/) |
| Styling | Tailwind CSS v4 + CSS Design Tokens |
| Unit tests | Jest + Testing Library |
| E2E tests | Playwright |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20.9.0
- npm ≥ 9

### Installation

```bash
git clone https://github.com/Tuyishimire-lab/Localpdf.git
cd Localpdf
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | Yes (contact form) | API key for the Resend email service |
| `NEXT_PUBLIC_GA_ID` | Optional | Google Analytics measurement ID |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Optional | Google Search Console verification token |

### Running Locally

```bash
npm run dev        # Start the dev server at http://localhost:3000
```

---

## Testing

```bash
npm test                  # Run all Jest unit tests
npm run test:watch        # Jest in watch mode
npm run test:coverage     # Jest with coverage report
npm run test:e2e          # Playwright end-to-end tests
npm run test:e2e:ui       # Playwright with interactive UI
```

---

## Deployment

The easiest way to deploy is [Vercel](https://vercel.com/new):

1. Import the repository on Vercel.
2. Set the environment variables listed above in the Vercel dashboard.
3. Deploy — Vercel detects Next.js automatically.

For other hosts, run:

```bash
npm run build
npm start
```

---

## Privacy Guarantee

LocalPDF processes all documents entirely in your browser using WebAssembly and JavaScript.
**No file is ever uploaded to any server.** The application can run fully offline after the initial page load (PWA-enabled).

---

## License

MIT
