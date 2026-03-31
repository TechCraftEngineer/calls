/** Utility functions. */

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}с`;
  if (secs === 0) return `${mins}м`;
  return `${mins}м ${secs}с`;
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Определяет, является ли устройство мобильным.
 * Проверяет как ширину экрана, так и User-Agent.
 *
 * @returns true если устройство мобильное, false иначе
 */
export function isMobileDevice(): boolean {
  // Проверка по ширине экрана
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    return true;
  }

  // Проверка по User-Agent
  if (typeof navigator !== "undefined" && typeof window !== "undefined") {
    const win = window as Window & { opera?: string };
    const userAgent = navigator.userAgent || navigator.vendor || win.opera || "";
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    return mobileRegex.test(userAgent.toLowerCase());
  }

  return false;
}
