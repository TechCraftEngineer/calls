"use client";

export default function UsersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-container">
      <div className="main-content">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Что-то пошло не так
            </h2>
            <p className="text-gray-600 mb-6">
              {error.message || "Произошла ошибка при загрузке пользователей"}
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
              aria-label="Попробовать снова"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
