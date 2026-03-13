import { paths } from "@calls/config";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-gray-700">
          Страница не найдена
        </h2>
        <p className="mb-8 text-gray-600">
          Извините, но страница, которую вы ищете, не существует.
        </p>
        <Link
          href={paths.root}
          className="rounded-lg bg-[#FFD600] px-6 py-3 font-semibold text-black transition-colors hover:bg-[#F0CC00]"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}
