const ROOTS = {
  ROOT: "/",
  DASHBOARD: "/", // главная после авторизации
  AUTH: "/auth",
  ONBOARDING: "/onboarding",
  STATISTICS: "/statistics",
  USERS: "/users",
  SETTINGS: "/settings",
  CALLS: "/calls",
  FORBIDDEN: "/403",
} as const;

export const paths = {
  root: ROOTS.ROOT,
  dashboard: {
    root: ROOTS.DASHBOARD,
  },
  auth: {
    root: ROOTS.AUTH,
    login: `${ROOTS.AUTH}/login`,
    signin: `${ROOTS.AUTH}/signin`,
    signout: `${ROOTS.AUTH}/signout`,
    signup: `${ROOTS.AUTH}/signup`,
    otp: `${ROOTS.AUTH}/otp`,
    forgotPassword: `${ROOTS.AUTH}/forgot-password`,
    resetPassword: `${ROOTS.AUTH}/reset-password`,
  },
  onboarding: {
    root: ROOTS.ONBOARDING,
    createWorkspace: `${ROOTS.ONBOARDING}/create-workspace`,
  },
  statistics: {
    root: ROOTS.STATISTICS,
    settings: `${ROOTS.STATISTICS}?tab=settings`,
    kpi: `${ROOTS.STATISTICS}?tab=kpi`,
  },
  users: {
    root: ROOTS.USERS,
  },
  settings: {
    root: ROOTS.SETTINGS,
    workspace: `${ROOTS.SETTINGS}/workspace`,
    integrations: `${ROOTS.SETTINGS}/integrations`,
    prompts: `${ROOTS.SETTINGS}/prompts`,
    backup: `${ROOTS.SETTINGS}/backup`,
    profile: `${ROOTS.SETTINGS}/profile`,
    appearance: `${ROOTS.SETTINGS}/appearance`,
    notifications: `${ROOTS.SETTINGS}/notifications`,
    display: `${ROOTS.SETTINGS}/display`,
  },
  calls: {
    root: ROOTS.CALLS,
    call: (id: number | string) => `${ROOTS.CALLS}/${id}`,
  },
  forbidden: ROOTS.FORBIDDEN,
} as const;
