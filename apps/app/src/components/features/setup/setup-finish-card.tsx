import { Button, Card } from "@calls/ui";
import { Loader2, Sparkles } from "lucide-react";

interface SetupFinishCardProps {
  onFinish: () => void;
  isLoading: boolean;
}

export function SetupFinishCard({ onFinish, isLoading }: SetupFinishCardProps) {
  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-8 text-primary" />
        </div>
        <h3 className="mb-2 text-xl font-bold">Отличная работа!</h3>
        <p className="mb-6 text-muted-foreground">
          Все шаги завершены. Теперь вы можете начать работу с системой.
        </p>
        <Button size="lg" onClick={onFinish} disabled={isLoading} className="px-8">
          {isLoading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 size-4" />
          )}
          Завершить настройку и перейти к дашборду
        </Button>
      </div>
    </Card>
  );
}
