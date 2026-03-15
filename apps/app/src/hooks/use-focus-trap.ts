import { useEffect, useRef } from "react";

export function useFocusTrap<T extends HTMLElement>(active: boolean = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const element = ref.current;
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const closeButton = element.querySelector<HTMLElement>(
          '[aria-label*="Закрыть"], [aria-label*="Close"]',
        );
        closeButton?.click();
      }
    };

    element.addEventListener("keydown", handleTabKey);
    element.addEventListener("keydown", handleEscapeKey);

    // Focus first element on mount
    firstElement?.focus();

    return () => {
      element.removeEventListener("keydown", handleTabKey);
      element.removeEventListener("keydown", handleEscapeKey);
    };
  }, [active]);

  return ref;
}
