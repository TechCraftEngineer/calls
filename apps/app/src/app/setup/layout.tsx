"use client";

import { paths } from "@calls/config";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { activeWorkspace, loading } = useWorkspace();

  // Redirect if already onboarded
  if (!loading && activeWorkspace?.isOnboarded) {
    router.replace(paths.root);
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground" role="status">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          <span>Загрузка...</span>
        </div>
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Нет доступа</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            У вас нет активной компании. Сначала создайте компанию.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(paths.onboarding.createWorkspace)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Создать компанию
            </button>
            <p className="text-xs text-muted-foreground">
              Нужна помощь?{" "}
              <a href="/docs" className="underline hover:text-foreground">
                Документация
              </a>{" "}
              или{" "}
              <a href="/support" className="underline hover:text-foreground">
                поддержка
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] py-8">
      <div className="mx-auto max-w-3xl px-4">{children}</div>
    </div>
  );
}
