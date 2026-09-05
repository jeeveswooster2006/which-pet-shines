"use client";

import { useState, useEffect } from "react";
import { Share2, Link2, Check } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  title: string;
  text?: string;
  className?: string;
}

// WhatsApp + Facebook (universal link-based share, no SDK/app-id needed),
// native Web Share on devices that support it, and copy-link everywhere else.
export function ShareButtons({ url, title, text, className = "" }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Feature-detect on the client only, one time after mount — avoids a
  // server/client render mismatch (navigator.share doesn't exist on the
  // server, and a lazy useState initializer would run on the client's first
  // render too, before hydration has had a chance to reconcile).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-shot mount detection, not a reactive cascade
    if (typeof navigator !== "undefined" && !!navigator.share) setCanNativeShare(true);
  }, []);

  const shareText = text ?? title;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  async function handleNativeShare() {
    try {
      await navigator.share({ title, text: shareText, url });
    } catch {
      // user cancelled — no-op
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without Clipboard API permission.
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {canNativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-95"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Share
        </button>
      )}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-95"
        aria-label="Share on WhatsApp"
      >
        WhatsApp
      </a>
      <a
        href={facebookHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-95"
        aria-label="Share on Facebook"
      >
        Facebook
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-full border-2 border-ink px-4 py-2 text-sm font-semibold text-ink transition-transform active:scale-95"
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
