/**
 * Invitation acceptance route - public, no auth required.
 * Creates user via Better Auth and adds to workspace.
 */

import { invitationsService } from "@calls/db";
import { Hono } from "hono";
import type { Auth } from "../auth";

export function createInvitationsRoutes(auth: Auth) {
  const r = new Hono();

  r.post("/accept", async (c) => {
    let body: { token?: string; password?: string; name?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : undefined;

    if (!token) {
      return c.json({ error: "Токен приглашения обязателен" }, 400);
    }
    if (!password || password.length < 8) {
      return c.json({ error: "Пароль должен быть не менее 8 символов" }, 400);
    }

    const createUserFn = async (opts: {
      email: string;
      password: string;
      name: string;
      givenName?: string;
      familyName?: string;
    }) => {
      const res = await auth.api.createUser({
        body: {
          email: opts.email,
          password: opts.password,
          name: opts.name,
          data: {
            givenName: opts.givenName ?? opts.name,
            familyName: opts.familyName ?? "",
          },
        },
      });
      const userId = res?.user?.id;
      if (!userId) {
        throw new Error("Не удалось создать пользователя");
      }
      return { id: userId };
    };

    try {
      const { userId } = await invitationsService.acceptInvitation(
        token,
        password,
        name,
        createUserFn,
      );
      return c.json({ success: true, userId });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Не удалось принять приглашение";
      return c.json({ error: msg }, 400);
    }
  });

  return r;
}
