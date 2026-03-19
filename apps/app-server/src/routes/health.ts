import type { Hono } from "hono";

export const registerHealthRoutes = (app: Hono) => {
  app.get("/", (c) =>
    c.json({
      message: "QBS Звонки API",
      version: process.env.APP_VERSION?.trim() || "unknown",
    }),
  );
  app.get("/health", (c) => c.json({ status: "ok" }));
};
