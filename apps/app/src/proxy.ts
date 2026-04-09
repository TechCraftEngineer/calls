import { paths } from "@calls/config";
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const publicPaths = ["/auth", "/invite", "/terms", "/privacy"];

/** Оптимистичная проверка сессии (cookie) для редиректов. Валидация — в каждом route. */
export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const pathname = request.nextUrl.pathname;
  const isPublicPath = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage =
    pathname === paths.auth.signin ||
    pathname === paths.auth.signup ||
    pathname === paths.auth.forgotPassword ||
    pathname === paths.auth.resetPassword;

  const isCreateWorkspacePage = pathname === paths.onboarding.createWorkspace;

  // onboarding/create-workspace: без сессии → signin
  if (isCreateWorkspacePage && !sessionCookie) {
    return NextResponse.redirect(new URL(paths.auth.signin, request.url));
  }

  // onboarding/create-workspace с сессией → показать страницу (не редиректить на root)
  if (isCreateWorkspacePage && sessionCookie) {
    return NextResponse.next();
  }

  // Авторизованный пользователь на странице входа → dashboard (workspace-provider сам решит, нужен ли create-workspace)
  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL(paths.root, request.url));
  }

  // Публичные пути — доступ без сессии
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Главная: с сессией → показать страницу, без → signin
  if (pathname === paths.root) {
    if (sessionCookie) return NextResponse.next();
    return NextResponse.redirect(new URL(paths.auth.signin, request.url));
  }

  // Защищённые маршруты: без сессии → signin
  if (!sessionCookie) {
    return NextResponse.redirect(new URL(paths.auth.signin, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
