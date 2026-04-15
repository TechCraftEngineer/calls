"use client";

import { paths } from "@calls/config";
import { Button } from "@calls/ui";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="main-content">
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-muted-foreground">403</h1>
            <h2 className="text-2xl font-semibold">Доступ запрещен</h2>
            <p className="text-muted-foreground">
              У вас нет прав для просмотра этой страницы. Обратитесь к администратору компании для
              получения доступа.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href={paths.dashboard.root}>На главную</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
