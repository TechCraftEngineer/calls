"use client";

import { Button, cn } from "@calls/ui";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type WaveSurfer from "wavesurfer.js";
import { useORPC } from "@/orpc/react";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function readWaveColors() {
  if (typeof document === "undefined") {
    return {
      wave: "oklch(0.7 0 0)",
      progress: "oklch(0.205 0 0)",
      cursor: "oklch(0.205 0 0)",
    };
  }
  const root = document.documentElement;
  const s = getComputedStyle(root);
  const muted = s.getPropertyValue("--muted-foreground").trim();
  const primary = s.getPropertyValue("--primary").trim();
  return {
    wave: muted || "oklch(0.7 0 0)",
    progress: primary || "oklch(0.205 0 0)",
    cursor: primary || "oklch(0.205 0 0)",
  };
}

interface CallWaveformPlayerProps {
  callId: string;
  className?: string;
  enhanced?: boolean;
  onDownloadRecording?: () => void;
  downloadingRecording?: boolean;
}

/**
 * Волнаформа и воспроизведение записи звонка ([wavesurfer.js](https://github.com/katspaugh/wavesurfer.js)).
 */
export function CallWaveformPlayer({
  callId,
  className,
  enhanced = false,
  onDownloadRecording,
  downloadingRecording = false,
}: CallWaveformPlayerProps) {
  const orpc = useORPC();
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const queryOptions = enhanced
    ? orpc.calls.getEnhancedPlaybackUrl.queryOptions({
        input: { call_id: callId },
      })
    : orpc.calls.getPlaybackUrl.queryOptions({
        input: { call_id: callId },
      });

  const { data, isPending, isError, isSuccess } = useQuery({
    ...queryOptions,
    enabled: !!callId,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isSuccess || !data || typeof window === "undefined") return;

    // Прямой presigned URL из Yandex S3 (CORS настроен)
    const url = data.url;
    if (!url) return;
    const durationSeconds = data.duration;

    let cancelled = false;
    const colors = readWaveColors();

    void import("wavesurfer.js").then(({ default: WaveSurfer }) => {
      if (cancelled || !containerRef.current) return;

      const durationOverride =
        typeof durationSeconds === "number" && durationSeconds > 0 ? durationSeconds : undefined;

      const ws = WaveSurfer.create({
        container: el,
        height: 72,
        url,
        duration: durationOverride,
        waveColor: colors.wave,
        progressColor: colors.progress,
        cursorColor: colors.cursor,
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
        fillParent: true,
        dragToSeek: true,
      });

      if (cancelled) {
        ws.destroy();
        return;
      }

      wavesurferRef.current = ws;

      const onReady = (d: number) => {
        setDuration(d);
        setReady(true);
      };
      const onTime = (t: number) => setCurrentTime(t);
      const onPlay = () => setPlaying(true);
      const onPause = () => setPlaying(false);
      const onFinish = () => {
        setPlaying(false);
        setCurrentTime(ws.getDuration());
      };

      ws.on("ready", onReady);
      ws.on("timeupdate", onTime);
      ws.on("play", onPlay);
      ws.on("pause", onPause);
      ws.on("finish", onFinish);

      ws.on("error", (err) => {
        console.error("WaveSurfer error:", err);
        setReady(false);
        setLoadError(err instanceof Error ? err.message : "Ошибка загрузки аудио");
      });
    });

    return () => {
      cancelled = true;
      const instance = wavesurferRef.current;
      wavesurferRef.current = null;
      instance?.destroy();
      setReady(false);
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setLoadError(null);
    };
  }, [isSuccess, data]);

  const togglePlay = () => {
    void wavesurferRef.current?.playPause();
  };

  if (!callId) {
    return <p className="text-muted-foreground text-sm">Запись недоступна</p>;
  }

  if (isPending) {
    return (
      <div
        className={cn(
          "flex min-h-[120px] items-center justify-center rounded-lg border border-border/60 bg-muted/30",
          className,
        )}
      >
        <Loader2 className="text-muted-foreground size-7 animate-spin" />
      </div>
    );
  }

  if (isError || !isSuccess || !data) {
    return <p className="text-muted-foreground text-sm">Файл записи не найден или недоступен</p>;
  }

  if (loadError) {
    return (
      <p className="text-destructive text-sm" aria-live="polite">
        Ошибка: {loadError}
      </p>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border/60 bg-muted/20 px-4 py-3", className)}>
      <div className="mb-3 flex items-center gap-2">
        <Volume2 className="text-muted-foreground size-4 shrink-0" />
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Запись
        </span>
      </div>

      <div className="relative min-h-[72px] w-full overflow-hidden rounded-md">
        <div ref={containerRef} className={cn("w-full", !ready && "invisible")} />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-muted/30">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="size-10 shrink-0 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 border-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={!ready}
            onClick={togglePlay}
            aria-label={playing ? "Пауза" : "Воспроизвести"}
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5 pl-0.5" />}
          </Button>
          {onDownloadRecording && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-10 shrink-0 rounded-full"
              disabled={downloadingRecording}
              onClick={onDownloadRecording}
              aria-label="Скачать запись"
              title="Скачать запись"
            >
              {downloadingRecording ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
            </Button>
          )}
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span className="opacity-50">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
