export type ValidatedPcm16Wav =
  | {
      valid: true;
      fmt: {
        audioFormat: number;
        numChannels: number;
        sampleRate: number;
        bitsPerSample: number;
        blockAlign: number;
      };
      data: {
        size: number;
        blockAlign: number;
      };
    }
  | { valid: false; reason: string };

export function validatePcm16WavBuffer(buffer: Buffer): ValidatedPcm16Wav {
  if (buffer.length < 12) {
    return { valid: false, reason: "Буфер слишком мал для RIFF/WAVE" };
  }

  const riff = buffer.toString("ascii", 0, 4);
  const wave = buffer.toString("ascii", 8, 12);
  if (riff !== "RIFF" || wave !== "WAVE") {
    return {
      valid: false,
      reason: `Некорректные сигнатуры RIFF/WAVE (riff=${riff}, wave=${wave})`,
    };
  }

  let offset = 12;
  let fmt: {
    audioFormat: number;
    numChannels: number;
    sampleRate: number;
    bitsPerSample: number;
    blockAlign: number;
  } | null = null;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    offset += 8;

    if (chunkSize > buffer.length - offset) {
      return {
        valid: false,
        reason: `Размер фрагмента ${chunkId} (${chunkSize}) превышает размер буфера`,
      };
    }

    if (chunkId === "fmt ") {
      if (chunkSize < 16 || offset + 16 > buffer.length) {
        return {
          valid: false,
          reason: `Некорректный fmt-фрагмент (size=${chunkSize})`,
        };
      }

      const audioFormat = buffer.readUInt16LE(offset);
      const numChannels = buffer.readUInt16LE(offset + 2);
      const sampleRate = buffer.readUInt32LE(offset + 4);
      const blockAlign = buffer.readUInt16LE(offset + 12);
      const bitsPerSample = buffer.readUInt16LE(offset + 14);

      if (audioFormat !== 1) {
        return {
          valid: false,
          reason: `Ожидался PCM (audioFormat=1), получено ${audioFormat}`,
        };
      }

      if (bitsPerSample !== 16) {
        return {
          valid: false,
          reason: `Ожидались 16-битные сэмплы (bitsPerSample=16), получено ${bitsPerSample}`,
        };
      }

      if (sampleRate === 0) {
        return {
          valid: false,
          reason: `Некорректная частота дискретизации (sampleRate=${sampleRate})`,
        };
      }

      const expectedBlockAlign = (numChannels * bitsPerSample) / 8;
      if (!Number.isInteger(expectedBlockAlign) || expectedBlockAlign <= 0) {
        return {
          valid: false,
          reason: `Неверный blockAlign, вычисленный из fmt (значение: ${expectedBlockAlign})`,
        };
      }

      if (blockAlign !== expectedBlockAlign) {
        return {
          valid: false,
          reason: `Размер блока выравнивания в fmt (${blockAlign}) не совпадает с ожидаемым (${expectedBlockAlign})`,
        };
      }

      fmt = { audioFormat, numChannels, sampleRate, bitsPerSample, blockAlign };
    }

    if (chunkId === "data") {
      if (!fmt) {
        return {
          valid: false,
          reason: "Отсутствует fmt-фрагмент перед data-фрагментом",
        };
      }
      const blockAlign = fmt.blockAlign;
      if (chunkSize <= 0) {
        return { valid: false, reason: "Фрагмент данных пуст" };
      }
      if (chunkSize % blockAlign !== 0) {
        return {
          valid: false,
          reason: `Размер фрагмента данных (${chunkSize}) не выровнен по blockAlign (${blockAlign})`,
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
    return { valid: false, reason: "Отсутствует fmt-фрагмент" };
  }
  return { valid: false, reason: "Отсутствует data-фрагмент" };
}
