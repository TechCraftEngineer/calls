import { Input, Label } from "@calls/ui";

interface TelegramReportSectionProps {
  botToken: string;
  onChange: (botToken: string) => void;
}

export default function TelegramReportSection({ botToken, onChange }: TelegramReportSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="telegram-bot-token">Telegram Bot Token</Label>
      <Input
        id="telegram-bot-token"
        type="password"
        value={botToken}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1234567890:ABCDEF..."
      />
    </div>
  );
}
