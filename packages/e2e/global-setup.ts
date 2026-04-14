import { chromium, type FullConfig } from '@playwright/test';

/**
 * Глобальная настройка для прогрева браузера и кеша
 * Выполняется один раз перед всеми тестами
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  if (!baseURL) return;

  // Прогреваем приложение
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Делаем один запрос для прогрева сервера
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    console.log('✓ Сервер прогрет');
  } catch (error) {
    console.warn('Предупреждение: Не удалось прогреть сервер', error);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
