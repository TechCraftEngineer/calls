import { authRouter } from "./routers/auth";
import { callsRouter } from "./routers/calls";
import { usersRouter } from "./routers/users";
import { settingsRouter } from "./routers/settings";
import { statisticsRouter } from "./routers/statistics";
import { reportsRouter } from "./routers/reports";

export const backendRouter = {
  auth: authRouter,
  calls: callsRouter,
  users: usersRouter,
  settings: settingsRouter,
  statistics: statisticsRouter,
  reports: reportsRouter,
};

export type BackendRouter = typeof backendRouter;
