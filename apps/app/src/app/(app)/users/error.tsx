"use client";

import { Button } from "@calls/ui";

export default function UsersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="main-content">
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Что-то пошло не так</h2>
          <p className="text-gray-600 mb-6">
            {error.message || "Произошла ошибка при загрузке пользователей"}
          </p>
          <Button onClick={reset} variant="default" aria-label="Попробовать снова">
            Попробовать снова
          </Button>
        </div>
      </div>
    </div>
  );
}
