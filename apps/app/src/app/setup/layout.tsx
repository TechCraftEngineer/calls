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
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
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
