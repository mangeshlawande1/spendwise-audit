"use client";

import { useState } from "react";

interface ShareButtonProps {
  auditId: string;
}

export function ShareButton({ auditId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/r/${auditId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Audit link copied to clipboard" : "Copy shareable audit link"}
      className="inline-flex items-center gap-2 border border-surface-border hover:border-slate-500 text-slate-400 hover:text-white px-4 py-2.5 rounded-xl text-sm transition-all"
    >
      {copied ? (
        <>
          <span>✓</span>
          <span>Link copied!</span>
        </>
      ) : (
        <>
          <span>🔗</span>
          <span>Share this audit</span>
        </>
      )}
    </button>
  );
}