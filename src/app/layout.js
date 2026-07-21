import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import { FileProvider } from "../context/FileContext";
import PWARegistration from "./components/PWARegistration";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  title: "LocalPDF | Free and Secure Client-Side PDF Tools",
  description: "Merge, split, compress, convert, rotate, watermark, page-number, protect and unlock PDFs 100% locally in your browser. Complete privacy, zero server uploads.",
  keywords: "PDF tools, merge PDF, split PDF, compress PDF, PDF to JPG, JPG to PDF, rotate PDF, watermark PDF, protect PDF, client-side PDF",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
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
        url: 'https://www.uselocalpdf.com/logo.png',
        width: 800,
        height: 800,
        alt: 'LocalPDF Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'LocalPDF | Free and Secure Client-Side PDF Tools',
    description: 'Merge, split, compress, convert, rotate, watermark, protect and unlock PDFs 100% locally in your browser. Complete privacy, zero server uploads.',
    images: ['https://www.uselocalpdf.com/logo.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <FileProvider>
          <div className="app-container">
            <Header />
            <main className="main-content">
              {children}
            </main>
            <Footer />
          </div>
        </FileProvider>
        <PWARegistration />
        <CookieConsent />
        <Analytics />
        
        {/* Google Analytics (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-96QW4FDKFV"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-96QW4FDKFV');
          `}
        </Script>
      </body>
    </html>
  );
}
