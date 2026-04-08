import { test as base } from "@playwright/test";

// Типы для тестовых данных
export interface TestUser {
  email: string;
  password: string;
  givenName: string;
  familyName?: string;
}

export interface AuthFixtures {
  validUser: TestUser;
  invalidUser: TestUser;
  testUsers: TestUser[];
}

// Расширяем базовый тест с фикстурами для аутентификации
export const test = base.extend<AuthFixtures>({
  validUser: async (_, use) => {
    const user: TestUser = {
      email: "test@example.com",
      password: "password123",
      givenName: "Иван",
      familyName: "Иванов",
    };
    await use(user);
  },

  invalidUser: async (_, use) => {
    const user: TestUser = {
      email: "invalid@example.com",
      password: "wrongpassword",
      givenName: "Неверный",
      familyName: "Пользователь",
    };
    await use(user);
  },

  testUsers: async (_, use) => {
    const users: TestUser[] = [
      {
        email: "user1@example.com",
        password: "password123",
        givenName: "Пользователь",
        familyName: "Первый",
      },
      {
        email: "user2@example.com",
        password: "password456",
        givenName: "Пользователь",
        familyName: "Второй",
      },
      {
        email: "admin@example.com",
        password: "adminpass123",
        givenName: "Администратор",
      },
    ];
    await use(users);
  },
});

export { expect } from "@playwright/test";
