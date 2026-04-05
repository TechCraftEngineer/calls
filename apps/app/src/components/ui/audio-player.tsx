"use client";

import { Button, cn } from "@calls/ui";
import { Loader2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  src?: string | null;
  autoPlay?: boolean;
  className?: string;
  /**
   * Если передано, используем это значение вместо `HTMLAudioElement.duration`.
   * Полезно, когда браузер неверно читает метаданные для конкретного формата/кодека.
   */
  durationSeconds?: number | null;
}

export default function AudioPlayer({
  src,
  autoPlay = false,
  className,
  durationSeconds,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekSliderRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const resolvedDurationOverride =
    typeof durationSeconds === "number" && durationSeconds > 0 ? durationSeconds : null;
  const [duration, setDuration] = useState(resolvedDurationOverride ?? 0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Если нет src, сразу показываем ошибку
  // useEffect(() => {
  //   setHasError(!src);
  // }, [src]);

  useEffect(() => {
    if (resolvedDurationOverride != null) {
      setDuration(resolvedDurationOverride);
    }
  }, [resolvedDurationOverride]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };
    const updateDuration = () => {
      const browserDuration = audio.duration;

      // Если override не передан — доверяем браузеру.
      if (resolvedDurationOverride == null) {
        setDuration(browserDuration || 0);
        return;
      }

      // Если браузер не смог прочитать длительность — используем override.
      if (
        !(typeof browserDuration === "number") ||
        !Number.isFinite(browserDuration) ||
        browserDuration <= 0
      ) {
        setDuration(resolvedDurationOverride);
        return;
      }

      // Браузер часто читает WAV корректно, но оставляем override как fallback.
      // Если разница небольшая (округление/погрешности контейнера) — берем браузер.
      const diffSeconds = Math.abs(browserDuration - resolvedDurationOverride);
      const relDiff = diffSeconds / browserDuration;
      const preferBrowser = diffSeconds <= 2 && relDiff <= 0.05;

      setDuration(preferBrowser ? browserDuration : resolvedDurationOverride);
    };
    const onEnded = () => setIsPlaying(false);
    const onCanPlay = () => setIsLoading(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);

    if (autoPlay) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("Auto-play failed:", err);
          setIsLoading(false);
          setIsPlaying(false);
        });
      }
      setIsPlaying(true);
    }

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
    };
  }, [autoPlay, isDragging, resolvedDurationOverride]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
  };

  const applySeek = useCallback((value: number) => {
    if (audioRef.current && !Number.isNaN(value)) {
      audioRef.current.currentTime = value;
    }
    setIsDragging(false);
  }, []);

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = (
    e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>,
  ) => {
    const time = parseFloat((e.currentTarget as HTMLInputElement).value);
    applySeek(time);
  };

  // В попапе при отпускании мыши над overlay событие приходит не на слайдер — перемотка не применялась.
  // Слушаем mouseup/touchend на document и применяем значение слайдера.
  useEffect(() => {
    if (!isDragging) return;
    const onDocumentPointerEnd = () => {
      const input = seekSliderRef.current;
      if (input) {
        const time = parseFloat(input.value);
        applySeek(time);
      } else {
        setIsDragging(false);
      }
    };
    document.addEventListener("mouseup", onDocumentPointerEnd);
    document.addEventListener("touchend", onDocumentPointerEnd, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mouseup", onDocumentPointerEnd);
      document.removeEventListener("touchend", onDocumentPointerEnd);
    };
  }, [isDragging, applySeek]);

  const formatTime = (time: number) => {
    if (Number.isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Если нет аудио или ошибка загрузки - показываем сообщение
  if (hasError) {
    return (
      <div className={cn("w-full flex items-center justify-center py-6", className)}>
        <p className="text-muted-foreground text-[13px]">Файл записи не найден</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <audio ref={audioRef} src={src ?? undefined} />

      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center gap-3 justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={toggleMute}
            title={isMuted ? "Включить звук" : "Выключить звук"}
            aria-label={isMuted ? "Включить звук" : "Выключить звук"}
          >
            {isMuted ? <VolumeX className="size-4.5" /> : <Volume2 className="size-4.5" />}
          </Button>
          <Button
            size="icon"
            className={cn(
              "size-14 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:scale-105 active:scale-95 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-muted disabled:shadow-none disabled:hover:scale-100 border-0 transition-all duration-200",
            )}
            onClick={togglePlay}
            disabled={isLoading}
            title={isPlaying ? "Пауза" : "Воспроизвести"}
            aria-label={isLoading ? "Загрузка" : isPlaying ? "Пауза" : "Воспроизвести"}
          >
            {isLoading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="size-6" />
            ) : (
              <Play className="size-6 ml-1" />
            )}
          </Button>
          <div className="w-8" />
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="text-[11px] text-muted-foreground font-semibold w-10 tabular-nums text-center">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative h-1.5 flex items-center">
            <input
              ref={seekSliderRef}
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleSeekChange}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="w-full h-full appearance-none bg-muted rounded-sm outline-none cursor-pointer relative z-2 m-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&:hover::-webkit-slider-thumb]:scale-110"
            />
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-sm z-1 pointer-events-none"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground font-semibold w-10 tabular-nums text-center">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
