/** Unit tests for invitation mode determination logic. */

import { describe, expect, it } from "bun:test";

// Type definition matching the one in page.tsx
interface Invitation {
  invitationType: "link" | "email";
  email: string | null;
  workspaceName: string;
  userExists: boolean;
  requiresPassword: boolean;
  role: "owner" | "admin" | "member";
  workspaceId: string;
  expiresAt?: Date;
}

type InviteMode =
  | "loading"
  | "checking-auth"
  | "checking-password"
  | "login-existing"
  | "register-new"
  | "join-button"
  | "create-password-then-join"
  | "wrong-email";

interface CurrentUser {
  id: string | number;
  email: string;
}

interface ComputeInviteModeParams {
  invitation: Invitation | null;
  isLoading: boolean;
  currentUser: CurrentUser | null;
  checkingAuth: boolean;
  userHasPassword: boolean | null;
}

function computeInviteMode({
  invitation,
  isLoading,
  currentUser,
  checkingAuth,
  userHasPassword,
}: ComputeInviteModeParams): InviteMode {
  if (isLoading || !invitation) {
    return "loading";
  }

  if (checkingAuth) {
    return "checking-auth";
  }

  // Неавторизован
  if (!currentUser) {
    if (invitation.userExists) {
      return "login-existing";
    } else {
      return "register-new";
    }
  }

  // Авторизован — проверяем email
  const isCorrectEmail =
    invitation.invitationType === "link" ||
    (invitation.email && currentUser.email.toLowerCase() === invitation.email.toLowerCase());

  if (!isCorrectEmail) {
    return "wrong-email";
  }

  // Email совпадает — проверяем наличие пароля
  if (userHasPassword === null) {
    return "checking-password";
  }

  if (userHasPassword) {
    return "join-button";
  } else {
    return "create-password-then-join";
  }
}

describe("computeInviteMode", () => {
  const baseInvitation: Invitation = {
    email: "user@example.com",
    role: "member",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    workspaceId: "ws-123",
    workspaceName: "Test Workspace",
    userExists: false,
    invitationType: "email",
    requiresPassword: true,
  };

  const linkInvitation: Invitation = {
    ...baseInvitation,
    invitationType: "link",
    email: null,
  };

  describe("loading state", () => {
    it("should return 'loading' when isLoading is true", () => {
      const result = computeInviteMode({
        invitation: baseInvitation,
        isLoading: true,
        currentUser: null,
        checkingAuth: false,
        userHasPassword: null,
      });
      expect(result).toBe("loading");
    });

    it("should return 'loading' when invitation is null", () => {
      const result = computeInviteMode({
        invitation: null,
        isLoading: false,
        currentUser: null,
        checkingAuth: false,
        userHasPassword: null,
      });
      expect(result).toBe("loading");
    });

    it("should prioritize loading over checkingAuth", () => {
      const result = computeInviteMode({
        invitation: baseInvitation,
        isLoading: true,
        currentUser: null,
        checkingAuth: true,
        userHasPassword: null,
      });
      expect(result).toBe("loading");
    });
  });

  describe("checking-auth state", () => {
    it("should return 'checking-auth' when checkingAuth is true", () => {
      const result = computeInviteMode({
        invitation: baseInvitation,
        isLoading: false,
        currentUser: null,
        checkingAuth: true,
        userHasPassword: null,
      });
      expect(result).toBe("checking-auth");
    });
  });

  describe("unauthorized users", () => {
    it("should return 'login-existing' for existing user without auth", () => {
      const result = computeInviteMode({
        invitation: { ...baseInvitation, userExists: true, requiresPassword: false },
        isLoading: false,
        currentUser: null,
        checkingAuth: false,
        userHasPassword: null,
      });
      expect(result).toBe("login-existing");
    });

    it("should return 'register-new' for new user without auth", () => {
      const result = computeInviteMode({
        invitation: { ...baseInvitation, userExists: false, requiresPassword: true },
        isLoading: false,
        currentUser: null,
        checkingAuth: false,
        userHasPassword: null,
      });
      expect(result).toBe("register-new");
    });
  });

  describe("authorized users with email invitation", () => {
    const currentUser: CurrentUser = {
      id: "user-123",
      email: "user@example.com",
    };

    it("should return 'wrong-email' when email does not match", () => {
      const result = computeInviteMode({
        invitation: { ...baseInvitation, email: "other@example.com" },
        isLoading: false,
        currentUser,
        checkingAuth: false,
        userHasPassword: true,
      });
      expect(result).toBe("wrong-email");
    });

    it("should return 'checking-password' when userHasPassword is null", () => {
      const result = computeInviteMode({
        invitation: baseInvitation,
        isLoading: false,
        currentUser,
        checkingAuth: false,
        userHasPassword: null,
      });
      expect(result).toBe("checking-password");
    });

    it("should return 'join-button' when user has password", () => {
      const result = computeInviteMode({
        invitation: baseInvitation,
        isLoading: false,
        currentUser,
        checkingAuth: false,
        userHasPassword: true,
      });
      expect(result).toBe("join-button");
    });

    it("should return 'create-password-then-join' when user has no password (OAuth)", () => {
      const result = computeInviteMode({
        invitation: baseInvitation,
        isLoading: false,
        currentUser,
        checkingAuth: false,
        userHasPassword: false,
      });
      expect(result).toBe("create-password-then-join");
    });

    it("should be case-insensitive for email comparison", () => {
      const result = computeInviteMode({
        invitation: { ...baseInvitation, email: "USER@EXAMPLE.COM" },
        isLoading: false,
        currentUser,
        checkingAuth: false,
        userHasPassword: true,
      });
      expect(result).toBe("join-button");
    });
  });

  describe("link invitations", () => {
    const currentUser: CurrentUser = {
      id: "user-123",
      email: "any@example.com",
    };

    it("should allow any email for link invitations", () => {
      const result = computeInviteMode({
        invitation: linkInvitation,
        isLoading: false,
        currentUser,
        checkingAuth: false,
        userHasPassword: true,
      });
      expect(result).toBe("join-button");
    });

    it("should return 'checking-password' for link invitation when password unknown", () => {
      const result = computeInviteMode({
        invitation: linkInvitation,
        isLoading: false,
        currentUser,
        checkingAuth: false,
        userHasPassword: null,
      });
      expect(result).toBe("checking-password");
    });

    it("should return 'create-password-then-join' for link invitation without password", () => {
      const result = computeInviteMode({
        invitation: linkInvitation,
        isLoading: false,
        currentUser,
        checkingAuth: false,
        userHasPassword: false,
      });
      expect(result).toBe("create-password-then-join");
    });
  });

  describe("edge cases", () => {
    it("should handle email invitation with null email field", () => {
      const result = computeInviteMode({
        invitation: { ...baseInvitation, email: null },
        isLoading: false,
        currentUser: { id: "user-123", email: "user@example.com" },
        checkingAuth: false,
        userHasPassword: true,
      });
      // email invitation with null email should fail email check
      expect(result).toBe("wrong-email");
    });

    it("should handle email invitation with empty email field", () => {
      const result = computeInviteMode({
        invitation: { ...baseInvitation, email: "" },
        isLoading: false,
        currentUser: { id: "user-123", email: "" },
        checkingAuth: false,
        userHasPassword: true,
      });
      // empty email doesn't match — requires non-empty email for comparison
      expect(result).toBe("wrong-email");
    });

    it("should prioritize loading over wrong-email check", () => {
      const result = computeInviteMode({
        invitation: baseInvitation,
        isLoading: true,
        currentUser: { id: "user-123", email: "wrong@example.com" },
        checkingAuth: false,
        userHasPassword: true,
      });
      expect(result).toBe("loading");
    });
  });
});
