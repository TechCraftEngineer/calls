const ROOTS = {
  ROOT: "/",
  DASHBOARD: "/", // главная после авторизации
  AUTH: "/auth",
  ONBOARDING: "/onboarding",
  STATISTICS: "/statistics",
  USERS: "/users",
  SETTINGS: "/settings",
  SETUP: "/setup",
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
    kpi: `${ROOTS.STATISTICS}/kpi`,
    kpiFromSetup: () => `${ROOTS.STATISTICS}/kpi?fromSetup=true`,
    grid: `${ROOTS.STATISTICS}/grid`,
    settings: `${ROOTS.STATISTICS}/settings`,
  },
  users: {
    root: ROOTS.USERS,
  },
  invite: {
    root: "/invite",
    byToken: (token: string) => `/invite/${token}`,
  },
  settings: {
    root: ROOTS.SETTINGS,
    workspace: `${ROOTS.SETTINGS}/workspace`,
    evaluation: `${ROOTS.SETTINGS}/evaluation`,
    integrations: `${ROOTS.SETTINGS}/integrations`,
    pbx: `${ROOTS.SETTINGS}/pbx`,
    pbxMegafon: `${ROOTS.SETTINGS}/pbx/megafon`,
    backup: `${ROOTS.SETTINGS}/backup`,
    profile: `${ROOTS.SETTINGS}/profile`,
    appearance: `${ROOTS.SETTINGS}/appearance`,
    notifications: `${ROOTS.SETTINGS}/notifications`,
    display: `${ROOTS.SETTINGS}/display`,
  },
  setup: {
    root: ROOTS.SETUP,
    pbxSetup: `${ROOTS.SETUP}/pbx-setup`,
    directory: `${ROOTS.SETUP}/directory`,
  },
  calls: {
    root: ROOTS.CALLS,
    call: (id: number | string) => `${ROOTS.CALLS}/${id}`,
    callModal: (id: number | string) => `${ROOTS.CALLS}/${id}?modal=true`,
  },
  forbidden: ROOTS.FORBIDDEN,
} as const;
