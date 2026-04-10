import { paths } from "@calls/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require onboarding check
const PUBLIC_ROUTES = [
  "/auth",
  "/api",
  "/_next",
  "/favicon.ico",
  "/setup", // Allow access to setup page itself
  "/onboarding",
  "/invite",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes and static files
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if user needs onboarding
  const isOnboarded = request.cookies.get("is_onboarded")?.value;
  const workspaceId = request.cookies.get("active_workspace_id")?.value;

  // If user has active workspace but not onboarded, redirect to setup
  if (workspaceId && isOnboarded === "false") {
    return NextResponse.redirect(new URL(paths.setup.root, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};
