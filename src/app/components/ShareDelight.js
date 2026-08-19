'use client';

import { useState } from 'react';
import { Copy, Check, Share2, MessageCircle, Heart } from 'lucide-react';

const XIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedinIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

export default function ShareDelight({ toolName = 'this tool' }) {
  const [copied, setCopied] = useState(false);

  const siteUrl = 'https://www.uselocalpdf.com';
  const shareText = `Just used LocalPDF to process my PDF files locally. 0% uploaded to cloud servers, 100% private and free. Highly recommended for sensitive docs! 🔒📄`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${siteUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = `${shareText}\n${siteUrl}`;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'LocalPDF – Private In-Browser PDF Tools',
          text: shareText,
          url: siteUrl,
        });
      } catch {
        // User dismissed
      }
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Hey, check out LocalPDF – it processes PDFs entirely in your browser without uploading files to any servers (great for confidential files): ${siteUrl}`
  )}`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Tired of uploading sensitive PDFs to cloud converters? @uselocalpdf runs 100% in your browser. Zero cloud uploads, works offline & free!`
  )}&url=${encodeURIComponent(siteUrl)}`;

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`;

  return (
    <div className="share-delight-container">
      <div className="share-delight-header">
        <Heart size={15} className="share-delight-heart" />
        <span>Loved the speed & privacy? <strong>Tell a coworker</strong></span>
      </div>

      <div className="share-delight-buttons">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="share-delight-btn share-whatsapp"
          title="Share on WhatsApp"
        >
          <MessageCircle size={15} />
          <span>WhatsApp</span>
        </a>

        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="share-delight-btn share-twitter"
          title="Share on X / Twitter"
        >
          <XIcon size={14} />
          <span>Post on X</span>
        </a>

        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="share-delight-btn share-linkedin"
          title="Share on LinkedIn"
        >
          <LinkedinIcon size={14} />
          <span>LinkedIn</span>
        </a>

        <button
          type="button"
          onClick={handleCopy}
          className={`share-delight-btn share-copy ${copied ? 'copied' : ''}`}
          title="Copy link to clipboard"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>

        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="share-delight-btn share-native"
            title="More share options"
          >
            <Share2 size={15} />
            <span>More</span>
          </button>
        )}
      </div>
    </div>
  );
}
