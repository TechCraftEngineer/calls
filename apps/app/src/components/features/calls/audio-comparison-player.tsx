"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@calls/ui";
import { skipToken, useQuery } from "@tanstack/react-query";
import { Radio, Volume2 } from "lucide-react";
import AudioPlayer from "@/components/ui/audio-player";
import { useORPC } from "@/orpc/react";

interface AudioComparisonPlayerProps {
  callId?: string | null;
  className?: string;
}

/**
 * Компонент для сравнения оригинального и улучшенного аудио
 */
export function AudioComparisonPlayer({
  callId,
  className,
}: AudioComparisonPlayerProps) {
  const orpc = useORPC();
  const id = callId?.trim() ?? "";
  const fallbackCallId = "__skip__";
  const originalQueryOptions = orpc.calls.getPlaybackUrl.queryOptions({
    input: { call_id: id || fallbackCallId },
  });
  const enhancedQueryOptions = orpc.calls.getEnhancedPlaybackUrl.queryOptions({
    input: { call_id: id || fallbackCallId },
  });

  const {
    data: originalData,
    isPending: originalPending,
    isError: originalError,
  } = useQuery({
    ...originalQueryOptions,
    queryFn: id ? originalQueryOptions.queryFn : skipToken,
  });

  const { data: enhancedData, isPending: enhancedPending } = useQuery({
    ...enhancedQueryOptions,
    queryFn: id ? enhancedQueryOptions.queryFn : skipToken,
  });

  if (!id) {
    return (
      <p className="text-muted-foreground text-[13px]">Файл записи не найден</p>
    );
  }

  const hasEnhancedAudio = enhancedData?.url != null;

  if (originalPending || enhancedPending) {
    return (
      <div className="flex items-center justify-center py-6">
        <div
          className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary"
          aria-hidden
        />
      </div>
    );
  }

  if (originalError || !originalData?.url) {
    return (
      <p className="text-muted-foreground text-[13px]">Файл записи не найден</p>
    );
  }

  // Если нет улучшенного аудио, показываем только оригинал
  if (!hasEnhancedAudio) {
    return (
      <div className={className}>
        <div className="mb-3 flex items-center gap-2 text-base font-medium">
          <Volume2 className="size-4" />
          Запись звонка
        </div>
        <AudioPlayer src={originalData.url} />
      </div>
    );
  }

  // Если есть улучшенное аудио, показываем табы для сравнения
  return (
    <div className={className}>
      <div className="mb-3 flex items-center gap-2 text-base font-medium">
        <Volume2 className="size-4" />
        Запись звонка
      </div>
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
            <AudioPlayer src={enhancedData.url} />
            <p className="text-muted-foreground text-xs">
              Аудио обработано с помощью ML для улучшения качества распознавания
            </p>
          </div>
        </TabsContent>
        <TabsContent value="original" className="mt-0">
          <div className="space-y-2">
            <AudioPlayer src={originalData.url} />
            <p className="text-muted-foreground text-xs">
              Оригинальная запись без обработки
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
