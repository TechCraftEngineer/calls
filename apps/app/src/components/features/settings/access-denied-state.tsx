import { paths } from "@calls/config";
import Link from "next/link";

interface AccessDeniedStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function AccessDeniedState({
  title = "Доступ запрещен",
  message = "У вас нет прав для изменения настроек компании",
  actionLabel = "На главную",
  actionHref = paths.dashboard.root,
}: AccessDeniedStateProps) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-4">{message}</p>
        <Link
          href={actionHref}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
