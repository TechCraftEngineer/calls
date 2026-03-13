const ROOTS = {
  ROOT: "/",
  DASHBOARD: "/", // главная после авторизации
  AUTH: "/auth",
  STATISTICS: "/statistics",
  USERS: "/users",
  SETTINGS: "/settings",
  CALLS: "/calls",
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
    profile: `${ROOTS.SETTINGS}/profile`,
    appearance: `${ROOTS.SETTINGS}/appearance`,
    notifications: `${ROOTS.SETTINGS}/notifications`,
    display: `${ROOTS.SETTINGS}/display`,
  },
  calls: {
    root: ROOTS.CALLS,
    call: (id: number | string) => `${ROOTS.CALLS}/${id}`,
  },
} as const;
