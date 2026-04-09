import { test as base } from "@playwright/test";
import type { TestUser } from "./auth";

// Роли в рабочем пространстве
export type WorkspaceRole = "admin" | "owner" | "member";

export interface CallTestUser extends TestUser {
  id: string;
  role: WorkspaceRole;
  internalExtensions?: string[];
  mobilePhones?: string[];
}

export interface MockCall {
  id: string;
  number: string;
  timestamp: string;
  direction: "inbound" | "outbound";
  internalNumber: string | null;
  managerName: string | null;
  operatorName: string | null;
  duration: number;
  status: "answered" | "missed" | "technical_error";
  managerId: string;
}

export interface CallsFixtures {
  // Пользователи с разными ролями
  adminUser: CallTestUser;
  memberUser: CallTestUser;
  memberUserWithoutExtensions: CallTestUser;

  // Мок-данные звонков
  mockCalls: MockCall[];
  adminUserCalls: MockCall[];
  memberUserCalls: MockCall[];
  otherUserCalls: MockCall[];
}

// Тестовые ID пользователей
const ADMIN_ID = "admin-user-id";
const MEMBER_ID = "member-user-id";
const MEMBER_NO_EXT_ID = "member-no-ext-id";
const OTHER_USER_ID = "other-user-id";

/**
 * Фикстуры для тестирования таблицы звонков с разными ролями
 */
export const test = base.extend<CallsFixtures>({
  // Администратор с полным доступом
  adminUser: async (_, use) => {
    const user: CallTestUser = {
      id: ADMIN_ID,
      email: "admin@example.com",
      password: "password123",
      givenName: "Админ",
      familyName: "Администраторов",
      role: "admin",
      internalExtensions: ["101", "102"],
      mobilePhones: ["+79990000001"],
    };
    await use(user);
  },

  // Участник с внутренними номерами
  memberUser: async (_, use) => {
    const user: CallTestUser = {
      id: MEMBER_ID,
      email: "member@example.com",
      password: "password123",
      givenName: "Участник",
      familyName: "Участников",
      role: "member",
      internalExtensions: ["201"],
      mobilePhones: ["+79990000002"],
    };
    await use(user);
  },

  // Участник без внутренних номеров (не должен видеть звонки)
  memberUserWithoutExtensions: async (_, use) => {
    const user: CallTestUser = {
      id: MEMBER_NO_EXT_ID,
      email: "member-no-ext@example.com",
      password: "password123",
      givenName: "Участник",
      familyName: "Безномеров",
      role: "member",
      internalExtensions: [],
      mobilePhones: [],
    };
    await use(user);
  },

  // Полный набор мок-звонков
  mockCalls: async (_, use) => {
    const calls: MockCall[] = [
      // Звонки администратора
      {
        id: "call-admin-1",
        number: "+74951234567",
        timestamp: new Date().toISOString(),
        direction: "inbound",
        internalNumber: "101",
        managerName: "Админ Администраторов",
        operatorName: "Админ Администраторов",
        duration: 120,
        status: "answered",
        managerId: ADMIN_ID,
      },
      {
        id: "call-admin-2",
        number: "+74951234568",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        direction: "outbound",
        internalNumber: "102",
        managerName: "Админ Администраторов",
        operatorName: "Админ Администраторов",
        duration: 60,
        status: "answered",
        managerId: ADMIN_ID,
      },
      // Звонки участника
      {
        id: "call-member-1",
        number: "+74959876543",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        direction: "inbound",
        internalNumber: "201",
        managerName: "Участник Участников",
        operatorName: "Участник Участников",
        duration: 180,
        status: "answered",
        managerId: MEMBER_ID,
      },
      {
        id: "call-member-2",
        number: "+74959876544",
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        direction: "outbound",
        internalNumber: "201",
        managerName: "Участник Участников",
        operatorName: "Участник Участников",
        duration: 45,
        status: "missed",
        managerId: MEMBER_ID,
      },
      // Звонки другого пользователя (не должны быть видны участнику)
      {
        id: "call-other-1",
        number: "+74951111111",
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        direction: "inbound",
        internalNumber: "301",
        managerName: "Другой Пользователь",
        operatorName: "Другой Пользователь",
        duration: 90,
        status: "answered",
        managerId: OTHER_USER_ID,
      },
      {
        id: "call-other-2",
        number: "+74952222222",
        timestamp: new Date(Date.now() - 18000000).toISOString(),
        direction: "outbound",
        internalNumber: "302",
        managerName: "Другой Пользователь",
        operatorName: "Другой Пользователь",
        duration: 30,
        status: "technical_error",
        managerId: OTHER_USER_ID,
      },
    ];
    await use(calls);
  },

  // Звонки администратора (что должен видеть admin - все звонки)
  adminUserCalls: async ({ mockCalls }, use) => {
    await use(mockCalls);
  },

  // Звонки участника (что должен видеть member)
  memberUserCalls: async ({ mockCalls }, use) => {
    const calls = mockCalls.filter((c) => c.managerId === MEMBER_ID || c.internalNumber === "201");
    await use(calls);
  },

  // Звонки других пользователей (member НЕ должен их видеть)
  otherUserCalls: async ({ mockCalls }, use) => {
    const calls = mockCalls.filter((c) => c.managerId === OTHER_USER_ID);
    await use(calls);
  },
});

export { expect } from "@playwright/test";
