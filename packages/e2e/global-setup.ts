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
    console.log('✓ Server warmed up');
  } catch (error) {
    console.warn('Warning: Could not warm up server', error);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
