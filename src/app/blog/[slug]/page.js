import { getPostBySlug, getAllPosts } from '../../../lib/blog';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const BASE = 'https://www.uselocalpdf.com';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const ogImage = `${BASE}/logo.png`;

  return {
    title: `${post.title} | LocalPDF Blog`,
    description: post.description,
    keywords: `PDF, ${post.category}, free PDF tools, browser PDF, LocalPDF`,
    alternates: { canonical: `${BASE}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${BASE}/blog/${post.slug}`,
      type: 'article',
      siteName: 'LocalPDF',
      publishedTime: post.date,
      authors: ['LocalPDF Team'],
      images: [{ url: ogImage, width: 800, height: 800, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
  };
}

export default async function BlogPost({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  // JSON-LD Article structured data
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'LocalPDF', url: BASE },
    publisher: {
      '@type': 'Organization',
      name: 'LocalPDF',
      url: BASE,
      logo: { '@type': 'ImageObject', url: `${BASE}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE}/blog/${slug}` },
    url: `${BASE}/blog/${slug}`,
  };

  // BreadcrumbList JSON-LD
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${BASE}/blog/${slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="blog-post-container">
        <Link href="/blog" className="blog-back-link">
          <ArrowLeft size={16} /> All Articles
        </Link>

        <div className="blog-post-header">
          <div className="blog-card-category">{post.category}</div>
          <h1 className="blog-post-title">{post.title}</h1>
          <div className="blog-post-meta">
            <span>{post.date}</span>
            {post.readTime && <span>· {post.readTime} read</span>}
          </div>
        </div>

        <article className="blog-post-content mdx-content">
          <MDXRemote source={post.content} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
        </article>

        <div className="blog-post-footer">
          <p>Found this helpful? Try LocalPDF&apos;s free PDF tools, all processing happens in your browser with zero file uploads.</p>
          <Link href="/" className="btn-primary" style={{ display: 'inline-flex', marginTop: '0.75rem' }}>
            Explore All Tools →
          </Link>
        </div>
      </div>
    </>
  );
}
