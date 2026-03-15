"use client";

import { useQuery } from "@tanstack/react-query";
import AudioPlayer from "@/components/ui/audio-player";
import { useORPC } from "@/orpc/react";

interface CallRecordPlayerProps {
  callId: number;
  className?: string;
}

/**
 * Воспроизведение записи звонка через oRPC getPlaybackUrl (presigned S3 URL).
 */
export function CallRecordPlayer({ callId, className }: CallRecordPlayerProps) {
  const orpc = useORPC();
  const { data, isPending, isError } = useQuery({
    ...orpc.calls.getPlaybackUrl.queryOptions({
      input: { call_id: String(callId) },
    }),
    enabled: !!callId,
  });

  if (!callId) {
    return (
      <p className="text-muted-foreground text-[13px]">Файл записи не найден</p>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-6">
        <div
          className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary"
          aria-hidden
        />
      </div>
    );
  }

  if (isError || !data?.url) {
    return (
      <p className="text-muted-foreground text-[13px]">Файл записи не найден</p>
    );
  }

  return <AudioPlayer src={data.url} className={className} />;
}
