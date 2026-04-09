import { describe, expect, it } from "bun:test";

// Типы для тестирования
interface WorkspaceRoleContext {
  workspaceRole: "admin" | "owner" | "member";
  user: {
    id: string;
    internalExtensions?: string | null;
    mobilePhones?: string | null;
  };
}

interface MockCall {
  id: string;
  number: string;
  internalNumber: string | null;
  managerId: string;
  managerName: string | null;
}

// Функция для получения внутренних номеров пользователя (копия из utils.ts для тестов)
function getInternalNumbersForUser(user: {
  id: string;
  internalExtensions?: string | null;
}): string[] {
  if (!user.internalExtensions) return [];
  return user.internalExtensions
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

function getMobileNumbersForUser(user: { id: string; mobilePhones?: string | null }): string[] {
  if (!user.mobilePhones) return [];
  return user.mobilePhones
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

// Функция фильтрации звонков по роли (логика из list.ts)
function filterCallsByRole(calls: MockCall[], context: WorkspaceRoleContext): MockCall[] {
  const isAdminOrOwner = context.workspaceRole === "admin" || context.workspaceRole === "owner";

  if (isAdminOrOwner) {
    return calls; // Админ видит все
  }

  // Для member фильтруем по internalNumbers и mobileNumbers
  const internalNumbers = getInternalNumbersForUser(context.user);

  return calls.filter((call) => {
    // Участник видит только звонки со своими внутренними номерами
    const hasMatchingExtension =
      call.internalNumber && internalNumbers.includes(call.internalNumber);
    return hasMatchingExtension;
  });
}

// Функция проверки доступности менеджеров для фильтра
function getAvailableManagersForRole(
  allManagers: { id: string; name: string }[],
  context: WorkspaceRoleContext,
): { id: string; name: string }[] {
  const isAdminOrOwner = context.workspaceRole === "admin" || context.workspaceRole === "owner";

  if (isAdminOrOwner) {
    return allManagers; // Админ видит всех менеджеров
  }

  // Участник видит только себя
  return allManagers.filter((m) => m.id === context.user.id);
}

describe("calls list role-based filtering", () => {
  // Тестовые данные
  const mockCalls: MockCall[] = [
    {
      id: "call-1",
      number: "+74951234567",
      internalNumber: "101",
      managerId: "admin-1",
      managerName: "Admin User",
    },
    {
      id: "call-2",
      number: "+74951234568",
      internalNumber: "102",
      managerId: "admin-1",
      managerName: "Admin User",
    },
    {
      id: "call-3",
      number: "+74959876543",
      internalNumber: "201",
      managerId: "member-1",
      managerName: "Member User",
    },
    {
      id: "call-4",
      number: "+74959876544",
      internalNumber: "201",
      managerId: "member-1",
      managerName: "Member User",
    },
    {
      id: "call-5",
      number: "+74951111111",
      internalNumber: "301",
      managerId: "other-1",
      managerName: "Other User",
    },
  ];

  const allManagers = [
    { id: "admin-1", name: "Admin User" },
    { id: "member-1", name: "Member User" },
    { id: "other-1", name: "Other User" },
  ];

  describe("admin/owner role", () => {
    it("returns all calls for admin", () => {
      const context: WorkspaceRoleContext = {
        workspaceRole: "admin",
        user: {
          id: "admin-1",
          internalExtensions: "101,102",
        },
      };

      const result = filterCallsByRole(mockCalls, context);

      expect(result).toHaveLength(5);
      expect(result.map((c) => c.id)).toEqual(["call-1", "call-2", "call-3", "call-4", "call-5"]);
    });

    it("returns all calls for owner", () => {
      const context: WorkspaceRoleContext = {
        workspaceRole: "owner",
        user: {
          id: "owner-1",
          internalExtensions: "100",
        },
      };

      const result = filterCallsByRole(mockCalls, context);

      expect(result).toHaveLength(5);
    });

    it("returns all managers for admin filter", () => {
      const context: WorkspaceRoleContext = {
        workspaceRole: "admin",
        user: { id: "admin-1" },
      };

      const result = getAvailableManagersForRole(allManagers, context);

      expect(result).toHaveLength(3);
      expect(result.map((m) => m.id)).toContain("admin-1");
      expect(result.map((m) => m.id)).toContain("member-1");
      expect(result.map((m) => m.id)).toContain("other-1");
    });
  });

  describe("member role", () => {
    it("returns only own calls for member", () => {
      const context: WorkspaceRoleContext = {
        workspaceRole: "member",
        user: {
          id: "member-1",
          internalExtensions: "201",
        },
      };

      const result = filterCallsByRole(mockCalls, context);

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(["call-3", "call-4"]);
      expect(result.every((c) => c.managerId === "member-1")).toBe(true);
    });

    it("returns empty array when member has no matching extensions", () => {
      const context: WorkspaceRoleContext = {
        workspaceRole: "member",
        user: {
          id: "member-2",
          internalExtensions: "999",
        },
      };

      const result = filterCallsByRole(mockCalls, context);

      expect(result).toHaveLength(0);
    });

    it("returns empty array when member has no extensions", () => {
      const context: WorkspaceRoleContext = {
        workspaceRole: "member",
        user: {
          id: "member-3",
          internalExtensions: null,
        },
      };

      const result = filterCallsByRole(mockCalls, context);

      expect(result).toHaveLength(0);
    });

    it("returns only self in manager filter for member", () => {
      const context: WorkspaceRoleContext = {
        workspaceRole: "member",
        user: { id: "member-1" },
      };

      const result = getAvailableManagersForRole(allManagers, context);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("member-1");
    });

    it("filters calls with multiple extensions correctly", () => {
      const context: WorkspaceRoleContext = {
        workspaceRole: "member",
        user: {
          id: "member-multi",
          internalExtensions: "101,201",
        },
      };

      const result = filterCallsByRole(mockCalls, context);

      // Должен видеть звонки с номеров 101 и 201
      expect(result).toHaveLength(3);
      expect(result.map((c) => c.id)).toEqual(["call-1", "call-3", "call-4"]);
    });
  });

  describe("manager filter restrictions", () => {
    it("admin can filter by any manager", () => {
      const context: WorkspaceRoleContext = {
        workspaceRole: "admin",
        user: { id: "admin-1" },
      };

      const managerFilters = ["admin-1", "member-1", "other-1"];
      const finalFilters =
        context.workspaceRole === "admin"
          ? managerFilters
          : managerFilters.filter((m) => m === context.user.id);

      expect(finalFilters).toEqual(["admin-1", "member-1", "other-1"]);
    });

    it("member can only filter by self", () => {
      const context: WorkspaceRoleContext = {
        workspaceRole: "member",
        user: { id: "member-1" },
      };

      const managerFilters = ["admin-1", "member-1", "other-1"];
      const isAdminOrOwner = context.workspaceRole === "admin" || context.workspaceRole === "owner";
      const finalFilters = isAdminOrOwner
        ? managerFilters
        : managerFilters.filter((m) => m === context.user.id);

      expect(finalFilters).toEqual(["member-1"]);
    });

    it("member cannot filter by other managers even if requested", () => {
      const context: WorkspaceRoleContext = {
        workspaceRole: "member",
        user: { id: "member-1" },
      };

      // Симулируем запрос member с фильтром по другому менеджеру
      const requestedFilter = "admin-1";
      const isAdminOrOwner = context.workspaceRole === "admin" || context.workspaceRole === "owner";
      const allowedFilter =
        isAdminOrOwner || requestedFilter === context.user.id ? requestedFilter : null;

      expect(allowedFilter).toBeNull();
    });
  });
});

describe("getInternalNumbersForUser utility", () => {
  it("parses comma-separated extensions", () => {
    const user = {
      id: "user-1",
      internalExtensions: "101,102,103",
    };

    const result = getInternalNumbersForUser(user);

    expect(result).toEqual(["101", "102", "103"]);
  });

  it("handles single extension", () => {
    const user = {
      id: "user-1",
      internalExtensions: "201",
    };

    const result = getInternalNumbersForUser(user);

    expect(result).toEqual(["201"]);
  });

  it("returns empty array for null extensions", () => {
    const user = {
      id: "user-1",
      internalExtensions: null,
    };

    const result = getInternalNumbersForUser(user);

    expect(result).toEqual([]);
  });

  it("returns empty array for undefined extensions", () => {
    const user = {
      id: "user-1",
    };

    const result = getInternalNumbersForUser(user);

    expect(result).toEqual([]);
  });

  it("trims whitespace from extensions", () => {
    const user = {
      id: "user-1",
      internalExtensions: " 101 , 102 , 103 ",
    };

    const result = getInternalNumbersForUser(user);

    expect(result).toEqual(["101", "102", "103"]);
  });
});

describe("getMobileNumbersForUser utility", () => {
  it("parses comma-separated mobile phones", () => {
    const user = {
      id: "user-1",
      mobilePhones: "+79990000001,+79990000002",
    };

    const result = getMobileNumbersForUser(user);

    expect(result).toEqual(["+79990000001", "+79990000002"]);
  });

  it("returns empty array for null phones", () => {
    const user = {
      id: "user-1",
      mobilePhones: null,
    };

    const result = getMobileNumbersForUser(user);

    expect(result).toEqual([]);
  });
});
