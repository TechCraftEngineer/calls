import { Card, CardContent, CardHeader, CardTitle } from "@calls/ui";
import AudioPlayer from "@/components/audio-player";
import type { CallDetail } from "../types";

interface Props {
  call: CallDetail;
}

export function CallAudioCard({ call }: Props) {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0.00 MB";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card className="sidebar-card">
      <CardHeader className="px-6 pt-6 pb-0">
        <CardTitle className="sidebar-card-title">🎵 ЗАПИСЬ ЗВОНКА</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-4">
        <div className="audio-player-container">
          {call.filename ? (
            <AudioPlayer
              src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000"}/api/records/${call.filename}`}
            />
          ) : (
            <div className="text-[13px] text-[#999]">Файл записи не найден</div>
          )}
        </div>
        <div className="mt-3 text-xs text-[#999]">
          Размер файла: {formatFileSize(call.size_bytes)}
        </div>
      </CardContent>
    </Card>
  );
}
