# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: packages\e2e\tests\auth\signup.spec.ts >> Страница регистрации >> показывает ошибку для короткого пароля
- Location: packages\e2e\tests\auth\signup.spec.ts:39:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/auth/signup", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | 
  3   | test.describe("Страница регистрации", () => {
  4   |   test.beforeEach(async ({ page }) => {
> 5   |     await page.goto("/auth/signup");
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6   |   });
  7   | 
  8   |   test("отображает форму регистрации", async ({ page }) => {
  9   |     // Проверяем основные элементы страницы
  10  |     await expect(page.locator("h1")).toContainText("Регистрация");
  11  |     await expect(page.locator("text=Создайте аккаунт QBS Звонки")).toBeVisible();
  12  | 
  13  |     // Проверяем поля формы
  14  |     await expect(page.locator("#email")).toBeVisible();
  15  |     await expect(page.locator("#givenName")).toBeVisible();
  16  |     await expect(page.locator("#familyName")).toBeVisible();
  17  |     await expect(page.locator("#password")).toBeVisible();
  18  |     await expect(page.locator('button[type="submit"]')).toContainText("Зарегистрироваться");
  19  |   });
  20  | 
  21  |   test("показывает ошибки валидации для пустых обязательных полей", async ({ page }) => {
  22  |     await page.click('button[type="submit"]');
  23  | 
  24  |     // Проверяем ошибки валидации для обязательных полей
  25  |     await expect(page.locator("text=Введите корректный email")).toBeVisible();
  26  |     await expect(page.locator("text=Имя обязательно")).toBeVisible();
  27  |     await expect(page.locator("text=Пароль должен содержать минимум 8 символов")).toBeVisible();
  28  |   });
  29  | 
  30  |   test("показывает ошибку для некорректного email", async ({ page }) => {
  31  |     await page.fill("#email", "неправильный-email");
  32  |     await page.fill("#givenName", "Иван");
  33  |     await page.fill("#password", "Password123");
  34  |     await page.click('button[type="submit"]');
  35  | 
  36  |     await expect(page.locator("text=Введите корректный email")).toBeVisible();
  37  |   });
  38  | 
  39  |   test("показывает ошибку для короткого пароля", async ({ page }) => {
  40  |     await page.fill("#email", "test@example.com");
  41  |     await page.fill("#givenName", "Иван");
  42  |     await page.fill("#password", "123");
  43  |     await page.click('button[type="submit"]');
  44  | 
  45  |     await expect(page.locator("text=Пароль должен содержать минимум 8 символов")).toBeVisible();
  46  |   });
  47  | 
  48  |   test("успешно отправляет форму с валидными данными", async ({ page }) => {
  49  |     await page.fill("#email", "newuser@example.com");
  50  |     await page.fill("#givenName", "Иван");
  51  |     await page.fill("#familyName", "Иванов");
  52  |     await page.fill("#password", "Password123");
  53  | 
  54  |     // Перехватываем запрос регистрации
  55  |     const responsePromise = page.waitForResponse(
  56  |       (response) => response.url().includes("/api/auth") && response.request().method() === "POST",
  57  |     );
  58  | 
  59  |     await page.click('button[type="submit"]');
  60  | 
  61  |     // Проверяем, что кнопка показывает состояние загрузки
  62  |     await expect(page.locator('button[type="submit"]')).toContainText("Регистрация…");
  63  | 
  64  |     await responsePromise;
  65  |   });
  66  | 
  67  |   test("работает без фамилии (необязательное поле)", async ({ page }) => {
  68  |     await page.fill("#email", "test@example.com");
  69  |     await page.fill("#givenName", "Иван");
  70  |     await page.fill("#password", "Password123");
  71  | 
  72  |     const responsePromise = page.waitForResponse(
  73  |       (response) => response.url().includes("/api/auth") && response.request().method() === "POST",
  74  |     );
  75  | 
  76  |     await page.click('button[type="submit"]');
  77  |     await responsePromise;
  78  |   });
  79  | 
  80  |   test("показывает ссылку на страницу входа", async ({ page }) => {
  81  |     const signinLink = page.locator('a[href="/auth/signin"]');
  82  |     await expect(signinLink).toContainText("Войдите");
  83  |     await expect(signinLink).toBeVisible();
  84  |   });
  85  | 
  86  |   test("показывает кнопку регистрации через Google", async ({ page }) => {
  87  |     const googleButton = page.locator("text=Зарегистрироваться через Google");
  88  |     await expect(googleButton).toBeVisible();
  89  | 
  90  |     // Проверяем иконку Google
  91  |     await expect(page.locator("svg").first()).toBeVisible();
  92  |   });
  93  | 
  94  |   test("поддерживает автозаполнение полей", async ({ page }) => {
  95  |     const emailField = page.locator("#email");
  96  |     const givenNameField = page.locator("#givenName");
  97  |     const familyNameField = page.locator("#familyName");
  98  |     const passwordField = page.locator("#password");
  99  | 
  100 |     await expect(emailField).toHaveAttribute("autocomplete", "email");
  101 |     await expect(givenNameField).toHaveAttribute("autocomplete", "given-name");
  102 |     await expect(familyNameField).toHaveAttribute("autocomplete", "family-name");
  103 |     await expect(passwordField).toHaveAttribute("autocomplete", "new-password");
  104 |   });
  105 | 
```