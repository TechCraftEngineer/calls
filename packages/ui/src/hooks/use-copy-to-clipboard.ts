"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseCopyToClipboardOptions {
  timeout?: number;
}

export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const { timeout = 1500 } = options;
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current != null) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const copyToClipboard = useCallback(
    async (text: string): Promise<boolean> => {
      if (!text) return false;
      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        if (copyTimeoutRef.current != null) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = window.setTimeout(
          () => setIsCopied(false),
          timeout,
        );
        return true;
      } catch {
        return false;
      }
    },
    [timeout],
  );

  return { isCopied, copyToClipboard };
}
