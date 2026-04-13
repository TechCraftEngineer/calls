import { expect, test } from "@playwright/test";

test.describe("Страница восстановления пароля", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/forgot-password");
  });

  test("отображает форму восстановления пароля", async ({ page }) => {
    // Проверяем основные элементы страницы
    await expect(page.locator("h1")).toContainText("Восстановление пароля");
    await expect(
      page.locator("text=Введите email — мы отправим ссылку для сброса пароля"),
    ).toBeVisible();

    // Проверяем поля формы
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Отправить ссылку");
  });

  test("показывает ошибку валидации для пустого email", async ({ page }) => {
    await page.click('button[type="submit"]');

    await expect(page.locator(".text-red-600", { hasText: "Введите email" })).toBeVisible();
  });

  test("показывает ошибку для некорректного email", async ({ page }) => {
    await page.fill("#email", "неправильный-email");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Введите корректный email")).toBeVisible();
  });

  test.skip("отправляет запрос на восстановление пароля", async () => {
    // Тест пропущен - требует мокирования API
  });

  test.skip("показывает сообщение об успешной отправке", async () => {
    // Тест пропущен - требует мокирования API
  });

  test("показывает ссылку возврата ко входу", async ({ page }) => {
    const backLink = page.locator('a[href="/auth/signin"]').first();
    await expect(backLink).toContainText("← Вернуться ко входу");
    await expect(backLink).toBeVisible();
  });

  test("поддерживает автозаполнение email", async ({ page }) => {
    const emailField = page.locator("#email");
    await expect(emailField).toHaveAttribute("autocomplete", "email");
  });

  test.skip("поддерживает отправку формы по Enter", async () => {
    // Тест пропущен - требует мокирования API
  });

  test("проверяет плейсхолдер поля email", async ({ page }) => {
    await expect(page.locator("#email")).toHaveAttribute("placeholder", "example@mail.com");
  });

  test("проверяет копирайт", async ({ page }) => {
    const currentYear = new Date().getFullYear();
    await expect(page.locator(`text=© ${currentYear} QBS Звонки`)).toBeVisible();
  });

  test.skip("скрывает форму после успешной отправки", async () => {
    // Тест пропущен - требует мокирования API
  });
});
