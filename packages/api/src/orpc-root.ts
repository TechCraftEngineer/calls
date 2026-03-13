import { authRouter } from "./routers/auth";
import { callsRouter } from "./routers/calls";
import { reportsRouter } from "./routers/reports";
import { settingsRouter } from "./routers/settings";
import { statisticsRouter } from "./routers/statistics";
import { usersRouter } from "./routers/users";

export const backendRouter = {
  auth: authRouter,
  calls: callsRouter,
  users: usersRouter,
  settings: settingsRouter,
  statistics: statisticsRouter,
  reports: reportsRouter,
};

export type BackendRouter = typeof backendRouter;
