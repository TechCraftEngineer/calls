/**
 * Компонент для демонстрации Tailwind CSS стилей
 */

"use client";

import { useState } from "react";

export default function TailwindShowcase() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className={`min-h-screen ${isDark ? "dark" : ""}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-soft border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-mango-yellow text-black font-bold rounded-lg flex items-center justify-center">
                  M
                </div>
                <h1 className="text-2xl font-bold text-primary-900 dark:text-white">
                  Tailwind CSS Showcase
                </h1>
              </div>
              <button
                onClick={toggleTheme}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isDark ? "🌞 Light" : "🌙 Dark"}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1 - Брендовые цвета */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-medium border border-gray-200 dark:border-gray-700 p-6 animate-slide-up">
              <h2 className="text-xl font-bold text-primary-900 dark:text-white mb-4">
                Брендовые цвета
              </h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-mango-yellow rounded-lg"></div>
                  <div>
                    <div className="font-semibold text-primary-800 dark:text-gray-200">
                      Mango Yellow
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      #FFD600
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-900 rounded-lg"></div>
                  <div>
                    <div className="font-semibold text-primary-800 dark:text-gray-200">
                      Primary Dark
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      #111111
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"></div>
                  <div>
                    <div className="font-semibold text-primary-800 dark:text-gray-200">
                      Background
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      #F5F5F7
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 - Кнопки */}
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-medium border border-gray-200 dark:border-gray-700 p-6 animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              <h2 className="text-xl font-bold text-primary-900 dark:text-white mb-4">
                Кнопки
              </h2>
              <div className="space-y-3">
                <button className="w-full py-3 bg-primary-900 text-white rounded-lg font-semibold hover:bg-primary-800 hover:-translate-y-px transition-all duration-200">
                  Primary Button
                </button>
                <button className="w-full py-3 bg-mango-yellow text-black rounded-lg font-semibold hover:bg-yellow-400 hover:-translate-y-px transition-all duration-200">
                  Mango Button
                </button>
                <button className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-primary-800 dark:text-gray-200 rounded-lg font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200">
                  Secondary Button
                </button>
                <button className="w-full py-3 bg-error-500 text-white rounded-lg font-semibold hover:bg-error-600 hover:-translate-y-px transition-all duration-200">
                  Error Button
                </button>
                <button className="w-full py-3 bg-success-500 text-white rounded-lg font-semibold hover:bg-success-600 hover:-translate-y-px transition-all duration-200">
                  Success Button
                </button>
              </div>
            </div>

            {/* Card 3 - Формы */}
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-medium border border-gray-200 dark:border-gray-700 p-6 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <h2 className="text-xl font-bold text-primary-900 dark:text-white mb-4">
                Формы
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-primary-800 dark:text-gray-200 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="example@mail.com"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-primary-900 dark:text-white focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary-800 dark:text-gray-200 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-primary-900 dark:text-white focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary-800 dark:text-gray-200 mb-2">
                    Message
                  </label>
                  <textarea
                    placeholder="Введите сообщение…"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-primary-900 dark:text-white focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20 transition-all duration-200 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Card 4 - Статусы */}
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-medium border border-gray-200 dark:border-gray-700 p-6 animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <h2 className="text-xl font-bold text-primary-900 dark:text-white mb-4">
                Статусы и уведомления
              </h2>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-success-50 text-success-600 border border-success-200 text-sm font-medium">
                  ✅ Успешное выполнение операции
                </div>
                <div className="p-3 rounded-lg bg-warning-50 text-warning-600 border border-warning-200 text-sm font-medium">
                  ⚠️ Внимание: проверьте данные
                </div>
                <div className="p-3 rounded-lg bg-error-50 text-error-600 border border-error-200 text-sm font-medium">
                  ❌ Ошибка: что-то пошло не так
                </div>
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-sm font-medium">
                  ℹ️ Информация: важное уведомление
                </div>
              </div>
            </div>

            {/* Card 5 - Текст и типографика */}
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-medium border border-gray-200 dark:border-gray-700 p-6 animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              <h2 className="text-xl font-bold text-primary-900 dark:text-white mb-4">
                Типографика
              </h2>
              <div className="space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-primary-900 dark:text-white">
                    Heading 1
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Основной заголовок страницы
                  </p>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-primary-800 dark:text-gray-200">
                    Heading 2
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Подзаголовок секции
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-primary-800 dark:text-gray-200">
                    Heading 3
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Заголовок подраздела
                  </p>
                </div>
                <p className="text-primary-700 dark:text-gray-300">
                  Обычный текст с{" "}
                  <span className="font-semibold">полужирным</span> и{" "}
                  <span className="text-mango-yellow font-semibold">
                    выделенным цветом
                  </span>{" "}
                  фрагментом.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Мелкий текст для дополнений и метаданных.
                </p>
              </div>
            </div>

            {/* Card 6 - Анимации */}
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-medium border border-gray-200 dark:border-gray-700 p-6 animate-slide-up"
              style={{ animationDelay: "0.5s" }}
            >
              <h2 className="text-xl font-bold text-primary-900 dark:text-white mb-4">
                Анимации и эффекты
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse-slow">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
                <button className="px-4 py-2 bg-mango-yellow text-black rounded-lg font-semibold hover:scale-105 transition-transform duration-200">
                  Hover: Scale
                </button>
                <button className="px-4 py-2 bg-primary-900 text-white rounded-lg font-semibold hover:bg-primary-800 transition-colors duration-200">
                  Hover: Color
                </button>
                <div className="flex space-x-2">
                  <div className="w-8 h-8 bg-mango-yellow rounded-full animate-bounce"></div>
                  <div
                    className="w-8 h-8 bg-primary-900 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-8 h-8 bg-success-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
