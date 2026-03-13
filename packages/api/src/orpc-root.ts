import { authRouter } from "./routers/auth";
import { callsRouter } from "./routers/calls";
import { reportsRouter } from "./routers/reports";
import { settingsRouter } from "./routers/settings";
import { statisticsRouter } from "./routers/statistics";
import { usersRouter } from "./routers/users";

/** Explicit type to avoid TS7056 (inferred type exceeds max length) */
type BackendRouterType = {
  auth: typeof authRouter;
  calls: typeof callsRouter;
  users: typeof usersRouter;
  settings: typeof settingsRouter;
  statistics: typeof statisticsRouter;
  reports: typeof reportsRouter;
};

export const backendRouter: BackendRouterType = {
  auth: authRouter,
  calls: callsRouter,
  users: usersRouter,
  settings: settingsRouter,
  statistics: statisticsRouter,
  reports: reportsRouter,
};

export type BackendRouter = BackendRouterType;
