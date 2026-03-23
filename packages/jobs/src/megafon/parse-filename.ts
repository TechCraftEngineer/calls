/**
 * Парсер имён файлов записей Megafon PBX.
 * Форматы:
 * - admin_out_79035553973_2026_03_13-09_54_56_mtkm.mp3 (исходящий)
 * - 79105308420_in_79361326729_2026_03_13-10_29_52_nclg.mp3 (входящий)
 */

export interface ParsedMegafonFilename {
  direction: "inbound" | "outbound";
  internalNumber: string;
  externalNumber: string;
  timestamp: string;
  rawFilename: string;
}

const OUT_PATTERN =
  /^(.+)_out_(\d+)_(\d{4})_(\d{2})_(\d{2})-(\d{2})_(\d{2})_(\d{2})_[a-z0-9]+\.mp3$/i;
const IN_PATTERN =
  /^(.+)_in_(\d+)_(\d{4})_(\d{2})_(\d{2})-(\d{2})_(\d{2})_(\d{2})_[a-z0-9]+\.mp3$/i;

export function parseMegafonFilename(
  filename: string,
): ParsedMegafonFilename | null {
  const baseName = filename.split("/").pop() ?? filename;

  let match = baseName.match(OUT_PATTERN);
  if (match) {
    const [, internal, number, y, m, d, h, min, s] = match;
    return {
      direction: "outbound",
      internalNumber: internal ?? "",
      externalNumber: number ?? "",
      timestamp: `${y}-${m}-${d}T${h}:${min}:${s}`,
      rawFilename: filename,
    };
  }

  match = baseName.match(IN_PATTERN);
  if (match) {
    const [, internal, number, y, m, d, h, min, s] = match;
    return {
      direction: "inbound",
      internalNumber: internal ?? "",
      externalNumber: number ?? "",
      timestamp: `${y}-${m}-${d}T${h}:${min}:${s}`,
      rawFilename: filename,
    };
  }

  return null;
}
