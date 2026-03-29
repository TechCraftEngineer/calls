import { Input, Label } from "@calls/ui";

interface TelegramReportSectionProps {
  botToken: string;
  onChange: (botToken: string) => void;
  disabled?: boolean;
}

export default function TelegramReportSection({
  botToken,
  onChange,
  disabled = false,
}: TelegramReportSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="telegram-bot-token">Токен Telegram Bot</Label>
      <Input
        id="telegram-bot-token"
        name="telegramBotToken"
        type="password"
        value={botToken}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1234567890:ABCDEF…"
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
