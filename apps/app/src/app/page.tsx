/**
 * Главная страница. Редирект выполняется в proxy.ts.
 * Этот компонент — fallback на случай прямого доступа (редко достигается).
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F5F5F7] font-sans">
      <div className="text-center py-10">Перенаправление...</div>
    </div>
  );
}
