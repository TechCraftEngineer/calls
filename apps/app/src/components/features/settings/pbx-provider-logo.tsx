"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Логотипы провайдеров АТС — загружаются из интернета.
 * Источники: Clearbit (приоритет), Google Favicon (fallback), SVG (резерв).
 */

const PROVIDER_DOMAINS: Record<string, string> = {
  megafon: "megafon.ru",
  mango: "mango-office.ru",
  mts: "mts.ru",
  beeline: "beeline.ru",
};

const FALLBACK_SVG: Record<
  string,
  { viewBox: string; content: React.ReactNode }
> = {
  megafon: {
    viewBox: "0 0 32 32",
    content: (
      <>
        <circle cx="16" cy="16" r="14" fill="#00C853" />
        <path
          fill="#fff"
          d="M16 10a6 6 0 0 0-6 6 6 6 0 0 0 6 6 6 6 0 0 0 6-6 6 6 0 0 0-6-6zm0 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z"
        />
      </>
    ),
  },
  mango: {
    viewBox: "0 0 32 32",
    content: (
      <>
        <ellipse cx="16" cy="17" rx="11" ry="12" fill="#FF6B35" />
        <ellipse cx="14" cy="15" rx="6" ry="7" fill="#FF8F65" opacity="0.9" />
        <path fill="#2D5016" d="M16 5v3l-1 2-1-1.5V5h2z" />
      </>
    ),
  },
  mts: {
    viewBox: "0 0 32 32",
    content: (
      <>
        <circle cx="16" cy="16" r="14" fill="#E30611" />
        <path
          fill="#fff"
          d="M12 12h2v8h-2zm6 0h2v8h-2zm-4 2h2v4h-2zm-4 2h2v2h-2zm8 0h2v2h-2z"
        />
      </>
    ),
  },
  beeline: {
    viewBox: "0 0 32 32",
    content: (
      <>
        <rect width="32" height="32" rx="6" fill="#FFD100" />
        <rect x="0" y="5" width="32" height="3" fill="#000" />
        <rect x="0" y="14" width="32" height="3" fill="#000" />
        <rect x="0" y="23" width="32" height="3" fill="#000" />
      </>
    ),
  },
};

interface PbxProviderLogoProps {
  providerId: string;
  className?: string;
  muted?: boolean;
}

export function PbxProviderLogo({
  providerId,
  className = "",
  muted = false,
}: PbxProviderLogoProps) {
  const [clearbitFailed, setClearbitFailed] = useState(false);
  const [showSvgFallback, setShowSvgFallback] = useState(false);
  const domain = PROVIDER_DOMAINS[providerId];
  const fallbackSvg = FALLBACK_SVG[providerId];

  useEffect(() => {
    // Reset per-provider load state when `providerId` changes.
    setClearbitFailed(false);
    setShowSvgFallback(false);
  }, [providerId]);

  const clearbitUrl = domain ? `https://logo.clearbit.com/${domain}` : null;
  const faviconUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    : null;

  const showClearbit = clearbitUrl && !clearbitFailed;
  const showFavicon = faviconUrl && clearbitFailed && !showSvgFallback;

  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-card p-1.5 shadow-sm ${className}`}
      aria-hidden
    >
      {showClearbit ? (
        <Image
          src={clearbitUrl}
          alt=""
          width={28}
          height={28}
          className={`object-contain ${muted ? "opacity-60" : ""}`}
          onError={() => setClearbitFailed(true)}
        />
      ) : showFavicon ? (
        <Image
          src={faviconUrl}
          alt=""
          width={28}
          height={28}
          className={`object-contain ${muted ? "opacity-60" : ""}`}
          onError={() => setShowSvgFallback(true)}
        />
      ) : fallbackSvg ? (
        <svg
          viewBox={fallbackSvg.viewBox}
          className={`size-6 ${muted ? "opacity-60" : ""}`}
        >
          {fallbackSvg.content}
        </svg>
      ) : null}
    </span>
  );
}
