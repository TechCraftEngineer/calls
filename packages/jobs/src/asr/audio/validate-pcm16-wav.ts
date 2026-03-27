export type ValidatedPcm16Wav =
  | {
      valid: true;
      fmt: {
        audioFormat: number;
        numChannels: number;
        sampleRate: number;
        bitsPerSample: number;
      };
      data: {
        size: number;
        blockAlign: number;
      };
    }
  | { valid: false; reason: string };

export function validatePcm16WavBuffer(buffer: Buffer): ValidatedPcm16Wav {
  if (buffer.length < 12) {
    return { valid: false, reason: "Buffer is too small for RIFF/WAVE" };
  }

  const riff = buffer.toString("ascii", 0, 4);
  const wave = buffer.toString("ascii", 8, 12);
  if (riff !== "RIFF" || wave !== "WAVE") {
    return {
      valid: false,
      reason: `Invalid magic bytes (riff=${riff}, wave=${wave})`,
    };
  }

  let offset = 12;
  let fmt: {
    audioFormat: number;
    numChannels: number;
    sampleRate: number;
    bitsPerSample: number;
  } | null = null;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    offset += 8;

    if (chunkSize > buffer.length - offset) {
      return {
        valid: false,
        reason: `Chunk ${chunkId} size (${chunkSize}) exceeds buffer`,
      };
    }

    if (chunkId === "fmt ") {
      if (chunkSize < 16 || offset + 16 > buffer.length) {
        return {
          valid: false,
          reason: `Invalid fmt chunk (size=${chunkSize})`,
        };
      }

      const audioFormat = buffer.readUInt16LE(offset);
      const numChannels = buffer.readUInt16LE(offset + 2);
      const sampleRate = buffer.readUInt32LE(offset + 4);
      const bitsPerSample = buffer.readUInt16LE(offset + 14);

      if (audioFormat !== 1) {
        return {
          valid: false,
          reason: `Expected PCM (audioFormat=1), got ${audioFormat}`,
        };
      }

      if (bitsPerSample !== 16) {
        return {
          valid: false,
          reason: `Expected 16-bit samples (bitsPerSample=16), got ${bitsPerSample}`,
        };
      }

      fmt = { audioFormat, numChannels, sampleRate, bitsPerSample };
    }

    if (chunkId === "data") {
      if (!fmt) {
        return { valid: false, reason: "Missing fmt chunk before data chunk" };
      }
      const blockAlign = (fmt.numChannels * fmt.bitsPerSample) / 8;
      if (!Number.isInteger(blockAlign) || blockAlign <= 0) {
        return {
          valid: false,
          reason: `Invalid block align derived from fmt (${blockAlign})`,
        };
      }
      if (chunkSize <= 0) {
        return { valid: false, reason: "Data chunk is empty" };
      }
      if (chunkSize % blockAlign !== 0) {
        return {
          valid: false,
          reason: `Data chunk size (${chunkSize}) is not aligned to blockAlign (${blockAlign})`,
        };
      }
      return {
        valid: true,
        fmt,
        data: {
          size: chunkSize,
          blockAlign,
        },
      };
    }

    offset += chunkSize;
    if (chunkSize % 2 === 1) offset += 1;
  }

  if (!fmt) {
    return { valid: false, reason: "Missing fmt chunk" };
  }
  return { valid: false, reason: "Missing data chunk" };
}
