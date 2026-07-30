/**
 * ShareButtons – Client Component
 * Renders share/copy buttons for each tool page.
 * Uses Web Share API with clipboard fallback.
 */
'use client';

import { useState } from 'react';
import { Share2, Copy, Check, Twitter, Linkedin } from 'lucide-react';

export default function ShareButtons({ title, url }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || 'LocalPDF – Free Client-Side PDF Tools';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
      } catch {
        // User cancelled
      }
    }
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle + ' — 100% free, no uploads')}&url=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="share-buttons">
      <span className="share-label">Share this tool:</span>

      <button className="share-btn" onClick={handleCopy} title="Copy link">
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? 'Copied!' : 'Copy Link'}
      </button>

      {typeof navigator !== 'undefined' && navigator.share && (
        <button className="share-btn" onClick={handleNativeShare} title="Share">
          <Share2 size={15} /> Share
        </button>
      )}

      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn share-btn-twitter"
        title="Share on X (Twitter)"
      >
        <Twitter size={15} /> X / Twitter
      </a>

      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn share-btn-linkedin"
        title="Share on LinkedIn"
      >
        <Linkedin size={15} /> LinkedIn
      </a>
    </div>
  );
}
