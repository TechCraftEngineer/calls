import { Card, CardContent, CardHeader, CardTitle } from "@calls/ui";
import type { CallDetail } from "@/types/calls";
import { CallWaveformPlayer } from "./call-waveform-player";

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
        <CallWaveformPlayer callId={call.id} />
        <div className="mt-3 text-xs text-[#999]">
          Размер файла: {formatFileSize(call.sizeBytes)}
        </div>
      </CardContent>
    </Card>
  );
}
