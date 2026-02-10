/**
 * Route Protection Middleware
 * Protects dashboard routes and API endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const COOKIE_NAME = "mbc_session";

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/demo",
  "/sms-consent",
];

// Routes that start with these prefixes are public
const publicPrefixes = [
  "/q/", // questionnaire magic links
  "/api/auth/", // auth endpoints
  "/api/q/", // questionnaire submission API
  "/_next/", // Next.js internals
  "/favicon.ico",
];

// API routes that require authentication
const protectedApiPrefixes = [
  "/api/patients",
  "/api/compliance",
  "/api/appointments",
  "/api/measures",
  "/api/audit",
];

async function getSessionFromCookie(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as {
      userId: string;
      email: string;
      role: "ADMIN" | "CLINICIAN";
      firstName: string;
      lastName: string;
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is public
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check if the route starts with a public prefix
  for (const prefix of publicPrefixes) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  // Get session
  const session = await getSessionFromCookie(request);

  // Check if this is an API route
  const isApiRoute = pathname.startsWith("/api/");

  // Check if this is a protected API route
  const isProtectedApi = protectedApiPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Handle unauthenticated requests
  if (!session) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    // Redirect to login for page requests
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control
  if (pathname.startsWith("/admin")) {
    if (session.role !== "ADMIN") {
      if (isApiRoute) {
        return NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        );
      }
      // Redirect clinicians to their dashboard
      return NextResponse.redirect(new URL("/clinician/patients", request.url));
    }
  }

  // For protected routes, add user info to headers for API routes
  if (isProtectedApi || pathname.startsWith("/admin") || pathname.startsWith("/clinician")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", session.userId);
    requestHeaders.set("x-user-email", session.email);
    requestHeaders.set("x-user-role", session.role);
    requestHeaders.set("x-user-firstname", session.firstName);
    requestHeaders.set("x-user-lastname", session.lastName);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
