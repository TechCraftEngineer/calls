import type { Hono } from "hono";

export const registerHealthRoutes = (app: Hono) => {
  app.get("/", (c) => c.json({ message: "QBS Звонки API", version: "2.0.0" }));
  app.get("/health", (c) => c.json({ status: "ok" }));
};
