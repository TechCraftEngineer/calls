"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@calls/ui";
import { useQuery } from "@tanstack/react-query";
import { Volume2, Radio } from "lucide-react";
import AudioPlayer from "@/components/ui/audio-player";
import { useORPC } from "@/orpc/react";

interface AudioComparisonPlayerProps {
  callId: string;
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

  const {
    data: originalData,
    isPending: originalPending,
    isError: originalError,
  } = useQuery({
    ...orpc.calls.getPlaybackUrl.queryOptions({
      input: { call_id: callId },
    }),
    enabled: !!callId,
  });

  const { data: enhancedData, isPending: enhancedPending } = useQuery({
    ...orpc.calls.getEnhancedPlaybackUrl.queryOptions({
      input: { call_id: callId },
    }),
    enabled: !!callId,
  });

  const hasEnhancedAudio = enhancedData?.url != null;

  if (!callId) {
    return (
      <p className="text-muted-foreground text-[13px]">Файл записи не найден</p>
    );
  }

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
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="size-4" />
            Запись звонка
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AudioPlayer src={originalData.url} />
        </CardContent>
      </Card>
    );
  }

  // Если есть улучшенное аудио, показываем табы для сравнения
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Volume2 className="size-4" />
          Запись звонка
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="enhanced" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
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
                Аудио обработано с помощью ML для улучшения качества
                распознавания
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
      </CardContent>
    </Card>
  );
}
