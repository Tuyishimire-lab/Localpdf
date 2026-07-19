'use client';

import Link from 'next/link';
import {
  Layers,
  Scissors,
  Minimize2,
  Image,
  FileUp,
  RotateCw,
  Type,
  Hash,
  Lock,
  Unlock,
  Grid
} from 'lucide-react';

const tools = [
  {
    id: 'organize',
    title: 'Organize PDF',
    description: 'Delete, reorder, duplicate, rotate, or insert blank pages into your PDF visually.',
    icon: Grid,
    href: '/tools/organize',
  },
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDF files into a single document in any order you choose.',
    icon: Layers,
    href: '/tools/merge',
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Extract specific pages or page ranges from a PDF, or split all pages into separate files.',
    icon: Scissors,
    href: '/tools/split',
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce the file size of your PDF documents by optimizing and scaling images client-side.',
    icon: Minimize2,
    href: '/tools/compress',
  },
  {
    id: 'pdf-to-jpg',
    title: 'PDF to JPG',
    description: 'Extract all pages in a PDF file into separate high-quality JPG/PNG images.',
    icon: Image,
    href: '/tools/pdf-to-jpg',
  },
  {
    id: 'jpg-to-pdf',
    title: 'JPG to PDF',
    description: 'Convert JPG, PNG, and WebP images into PDF format with custom sizes and page layouts.',
    icon: FileUp,
    href: '/tools/jpg-to-pdf',
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    description: 'Rotate individual pages or all pages of a PDF visually and save the changes.',
    icon: RotateCw,
    href: '/tools/rotate',
  },
  {
    id: 'watermark',
    title: 'Watermark',
    description: 'Stamp custom text or images onto your PDF pages with adjustable opacity, angle, and position.',
    icon: Type,
    href: '/tools/watermark',
  },
  {
    id: 'page-numbers',
    title: 'Page Numbers',
    description: 'Add page numbers to your PDF documents with customizable placement, size, and fonts.',
    icon: Hash,
    href: '/tools/page-numbers',
  },
  {
    id: 'protect',
    title: 'Protect PDF',
    description: 'Encrypt your PDF documents with owner and user passwords to restrict unauthorized access.',
    icon: Lock,
    href: '/tools/protect',
  },
  {
    id: 'unlock',
    title: 'Unlock PDF',
    description: 'Decrypt and remove password protection from PDFs so you can access them without prompt.',
    icon: Unlock,
    href: '/tools/unlock',
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            'name': 'LocalPDF',
            'operatingSystem': 'All',
            'applicationCategory': 'UtilitiesApplication',
            'description': 'Free and secure client-side PDF tools operating 100% in your browser. No files uploaded to servers.',
            'offers': {
              '@type': 'Offer',
              'price': '0',
              'priceCurrency': 'USD'
            }
          })
        }}
      />
      <section className="dashboard-title-section">
        <h1 className="dashboard-title">
          Every tool you need to work with <span>PDFs</span>
        </h1>
        <p className="dashboard-subtitle">
          100% secure, private, and client-side. Your files never leave your computer everything is processed instantly in your web browser.
        </p>
      </section>

      <div className="tools-grid">
        {tools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <Link key={tool.id} href={tool.href} className="tool-card">
              <div className="tool-card-icon-container">
                <IconComponent size={24} />
              </div>
              <h2 className="tool-card-title">{tool.title}</h2>
              <p className="tool-card-description">{tool.description}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
