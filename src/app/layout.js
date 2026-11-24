import "@fontsource-variable/outfit";
import "@fontsource-variable/inter";
import "@fontsource/alex-brush";
import "@fontsource/caveat/700.css";
import "@fontsource/great-vibes";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";
import ConsentAnalytics from "./components/ConsentAnalytics";
import { FileProvider } from "../context/FileContext";
import { ToastProvider } from "../context/ToastContext";
import PWARegistration from "./components/PWARegistration";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PwaFileHandler from "./components/PwaFileHandler";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('localpdf_theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}else{document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`;

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  metadataBase: new URL('https://www.uselocalpdf.com'),
  title: "LocalPDF | Free and Secure Client-Side PDF Tools",
  description: "Merge, split, compress, convert, rotate, watermark, page-number, protect and unlock PDFs 100% locally in your browser. Complete privacy, zero server uploads.",
  keywords: "PDF tools, merge PDF, split PDF, compress PDF, PDF to JPG, JPG to PDF, rotate PDF, watermark PDF, protect PDF, client-side PDF",
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
  icons: {
    icon: '/favicon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'LocalPDF | Free and Secure Client-Side PDF Tools',
    description: 'Merge, split, compress, convert, rotate, watermark, protect and unlock PDFs 100% locally in your browser. Complete privacy, zero server uploads.',
    url: 'https://www.uselocalpdf.com',
    siteName: 'LocalPDF',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LocalPDF — Free Client-Side PDF Tools',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LocalPDF | Free and Secure Client-Side PDF Tools',
    description: 'Merge, split, compress, convert, rotate, watermark, protect and unlock PDFs 100% locally in your browser. Complete privacy, zero server uploads.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }) {
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'LocalPDF',
    url: 'https://www.uselocalpdf.com',
    description: 'Free browser-based PDF tools. Merge, split, compress, convert, sign, and more, with 100% local processing and zero file uploads.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: 'https://www.uselocalpdf.com/?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  };

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LocalPDF',
    url: 'https://www.uselocalpdf.com',
    logo: 'https://www.uselocalpdf.com/logo.png',
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', url: 'https://www.uselocalpdf.com/contact' },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <ToastProvider>
          <FileProvider>
            <PwaFileHandler />
            <div className="app-container">
              <Header />
              <main className="main-content">
                {children}
              </main>
              <Footer />
            </div>
          </FileProvider>
        </ToastProvider>
        <PWARegistration />
        <CookieConsent />
        <PWAInstallPrompt />
        <ConsentAnalytics />
      </body>
    </html>
  );
}
