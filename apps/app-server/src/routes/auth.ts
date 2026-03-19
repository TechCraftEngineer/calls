import type { Hono } from "hono";
import { auth } from "../auth";

export const registerAuthRoutes = (app: Hono) => {
  // Better Auth handler for /api/auth/* (sign-in, sign-out, get-session, callbacks)
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
};
