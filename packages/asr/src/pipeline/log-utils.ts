const ASR_LOG_TEXT_MAX_LENGTH = 500;
const ASR_LOG_ERROR_MAX_LENGTH = 300;

export function truncateForLog(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
}

export { ASR_LOG_ERROR_MAX_LENGTH, ASR_LOG_TEXT_MAX_LENGTH };
