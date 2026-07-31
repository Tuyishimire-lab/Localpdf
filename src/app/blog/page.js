export const dynamic = 'force-static';

import Link from 'next/link';
import { getAllPosts } from '../../lib/blog';

const BASE = 'https://www.uselocalpdf.com';

export const metadata = {
  title: 'PDF Guides & Tutorials | LocalPDF Blog',
  description: 'Free step-by-step guides on compressing, merging, converting, signing, and securing PDF files. All tools work in your browser with no file uploads.',
  keywords: 'PDF guides, PDF tutorials, how to compress PDF, merge PDF guide, PDF tips, free PDF tools',
  alternates: { canonical: `${BASE}/blog` },
  openGraph: {
    title: 'PDF Guides & Tutorials | LocalPDF Blog',
    description: 'Free step-by-step guides on compressing, merging, converting, signing, and securing PDF files.',
    url: `${BASE}/blog`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Blog' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF Guides & Tutorials | LocalPDF Blog',
    description: 'Free step-by-step guides on compressing, merging, converting, signing, and securing PDF files.',
    images: [`${BASE}/logo.png`],
  },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <div className="blog-container">
      <div className="blog-header">
        <h1 className="blog-index-title">PDF Guides &amp; Resources</h1>
        <p className="blog-index-subtitle">
          Free step-by-step guides to help you get the most out of PDF tools from compression to security and everything in between.
        </p>
      </div>

      <div className="blog-grid">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card">
            <div className="blog-card-category">{post.category}</div>
            <h2 className="blog-card-title">{post.title}</h2>
            <p className="blog-card-desc">{post.description}</p>
            <div className="blog-card-meta">
              <span>{post.date}</span>
              {post.readTime && <span>· {post.readTime} read</span>}
            </div>
          </Link>
        ))}
      </div>

      {posts.length === 0 && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem 0' }}>
          Articles coming soon. Check back shortly!
        </p>
      )}
    </div>
  );
}
