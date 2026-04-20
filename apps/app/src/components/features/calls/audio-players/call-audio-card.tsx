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
import { Radio, Volume2 } from "lucide-react";
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
              <CallWaveformPlayer callId={call.id} enhanced={true} />
              <p className="text-muted-foreground text-xs">
                Аудио обработано с помощью ML для улучшения качества распознавания
              </p>
            </div>
          </TabsContent>
          <TabsContent value="original" className="mt-0">
            <div className="space-y-2">
              <CallWaveformPlayer callId={call.id} enhanced={false} />
              <p className="text-muted-foreground text-xs">Оригинальная запись без обработки</p>
            </div>
          </TabsContent>
        </Tabs>
        <div className="mt-3 text-xs text-[#999]">
          Размер файла: {formatFileSize(call.sizeBytes)}
        </div>
      </CardContent>
    </Card>
  );
}
