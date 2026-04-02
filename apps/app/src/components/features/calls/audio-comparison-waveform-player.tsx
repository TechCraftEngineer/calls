"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@calls/ui";
import { useQuery } from "@tanstack/react-query";
import { Radio, Volume2 } from "lucide-react";
import { useORPC } from "@/orpc/react";
import { CallWaveformPlayer } from "./call-waveform-player";

interface AudioComparisonWaveformPlayerProps {
  callId?: string | null;
  className?: string;
  onDownloadRecording?: () => void;
  downloadingRecording?: boolean;
}

/**
 * Компонент для сравнения оригинального и улучшенного аудио с wavesurfer.js
 */
export function AudioComparisonWaveformPlayer({
  callId,
  className,
  onDownloadRecording,
  downloadingRecording,
}: AudioComparisonWaveformPlayerProps) {
  const orpc = useORPC();
  const id = callId?.trim() ?? "";

  const {
    data: originalData,
    isPending: originalPending,
    isError: originalError,
  } = useQuery({
    ...orpc.calls.getPlaybackUrl.queryOptions({
      input: { call_id: id },
    }),
    enabled: !!id,
  });

  const { data: enhancedData, isPending: enhancedPending } = useQuery({
    ...orpc.calls.getEnhancedPlaybackUrl.queryOptions({
      input: { call_id: id },
    }),
    enabled: !!id,
  });

  if (!id) {
    return <p className="text-muted-foreground text-[13px]">Файл записи не найден</p>;
  }

  const hasEnhancedAudio = enhancedData?.url != null;

  if (originalPending || enhancedPending) {
    return (
      <div className="flex items-center justify-center py-6">
        <span className="sr-only" role="status" aria-live="polite">
          Загрузка аудио
        </span>
        <div
          className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (originalError || !originalData?.url) {
    return <p className="text-muted-foreground text-[13px]">Файл записи не найден</p>;
  }

  // Если нет улучшенного аудио, показываем только оригинал
  if (!hasEnhancedAudio) {
    return (
      <div className={className}>
        <CallWaveformPlayer
          callId={id}
          onDownloadRecording={onDownloadRecording}
          downloadingRecording={downloadingRecording}
        />
      </div>
    );
  }

  // Если есть улучшенное аудио, показываем табы для сравнения
  return (
    <div className={className}>
      <Tabs defaultValue="enhanced" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="enhanced" className="gap-2">
            <Radio className="size-3.5" />
            Улучшенное
          </TabsTrigger>
          <TabsTrigger value="original" className="gap-2">
            <Volume2 className="size-3.5" />
            Оригинал
          </TabsTrigger>
        </TabsList>
        <TabsContent value="enhanced" className="mt-0">
          <div className="space-y-2">
            <CallWaveformPlayer
              callId={id}
              enhanced
              onDownloadRecording={onDownloadRecording}
              downloadingRecording={downloadingRecording}
            />
            <p className="text-muted-foreground text-xs">
              Аудио обработано с помощью ML для улучшения качества распознавания
            </p>
          </div>
        </TabsContent>
        <TabsContent value="original" className="mt-0">
          <div className="space-y-2">
            <CallWaveformPlayer
              callId={id}
              onDownloadRecording={onDownloadRecording}
              downloadingRecording={downloadingRecording}
            />
            <p className="text-muted-foreground text-xs">Оригинальная запись без обработки</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
