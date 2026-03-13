import { paths } from "@calls/config";
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/** Оптимистичная проверка сессии (cookie) для редиректов. Валидация — в каждом route. */
export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname === paths.auth.signin || pathname === paths.auth.signup;

  // Авторизованный пользователь на странице входа → dashboard
  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL(paths.dashboard.root, request.url));
  }

  // Главная: с сессией → dashboard, без → signin
  if (pathname === paths.root) {
    return NextResponse.redirect(
      new URL(
        sessionCookie ? paths.dashboard.root : paths.auth.signin,
        request.url,
      ),
    );
  }

  // Защищённые маршруты: без сессии → signin
  if (!sessionCookie) {
    return NextResponse.redirect(new URL(paths.auth.signin, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/calls/:path*",
    "/settings/:path*",
    "/statistics/:path*",
    "/users/:path*",
    "/auth/signin",
    "/auth/signup",
  ],
};
