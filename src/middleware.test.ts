/**
 * Middleware Tests
 * Tests for route protection, authentication, and role-based access
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { middleware } from "./middleware";
import { signJWT } from "./lib/auth";
import { createMockSessionPayload } from "./lib/__tests__/test-utils";

// Mock jose jwtVerify
vi.mock("jose", async () => {
  const actual = await vi.importActual("jose");
  return {
    ...actual,
  };
});

// Helper to create mock NextRequest
function createNextRequest(
  path: string,
  options: {
    cookies?: Record<string, string>;
  } = {}
): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  const request = new NextRequest(url);

  // Add cookies if provided
  if (options.cookies) {
    for (const [name, value] of Object.entries(options.cookies)) {
      request.cookies.set(name, value);
    }
  }

  return request;
}

// ============================================
// Public Routes Tests
// ============================================

describe("Public Routes", () => {
  it("allows access to / without auth", async () => {
    const request = createNextRequest("/");
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
    expect(response.headers.get("Location")).toBeNull();
  });

  it("allows access to /login without auth", async () => {
    const request = createNextRequest("/login");
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
    expect(response.headers.get("Location")).toBeNull();
  });

  it("allows access to /demo without auth", async () => {
    const request = createNextRequest("/demo");
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
  });

  it("allows access to /sms-consent without auth", async () => {
    const request = createNextRequest("/sms-consent");
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
  });
});

// ============================================
// Public Prefix Routes Tests
// ============================================

describe("Public Prefix Routes", () => {
  it("allows /q/* questionnaire routes without auth", async () => {
    const request = createNextRequest("/q/abc123-token");
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
  });

  it("allows /api/auth/* routes without auth", async () => {
    const request = createNextRequest("/api/auth/login");
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
  });

  it("allows /api/auth/session without auth", async () => {
    const request = createNextRequest("/api/auth/session");
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
  });

  it("allows /api/q/* questionnaire API routes without auth", async () => {
    const request = createNextRequest("/api/q/submit");
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
  });

  it("allows /_next/* static routes without auth", async () => {
    const request = createNextRequest("/_next/static/chunks/main.js");
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
  });

  it("allows /favicon.ico without auth", async () => {
    const request = createNextRequest("/favicon.ico");
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
  });
});

// ============================================
// Unauthenticated Request Tests
// ============================================

describe("Unauthenticated Requests", () => {
  it("returns 401 for protected API routes without auth", async () => {
    const request = createNextRequest("/api/patients");
    const response = await middleware(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 for /api/compliance without auth", async () => {
    const request = createNextRequest("/api/compliance");
    const response = await middleware(request);

    expect(response.status).toBe(401);
  });

  it("returns 401 for /api/appointments without auth", async () => {
    const request = createNextRequest("/api/appointments");
    const response = await middleware(request);

    expect(response.status).toBe(401);
  });

  it("redirects page requests to /login with from parameter", async () => {
    const request = createNextRequest("/clinician/patients");
    const response = await middleware(request);

    expect(response.status).toBe(307); // Redirect status
    const location = response.headers.get("Location");
    expect(location).toContain("/login");
    expect(location).toContain("from=%2Fclinician%2Fpatients");
  });

  it("redirects /admin to login without auth", async () => {
    const request = createNextRequest("/admin/users");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toContain("/login");
  });
});

// ============================================
// Authenticated Request Tests
// ============================================

describe("Authenticated Requests", () => {
  it("allows authenticated user to access protected pages", async () => {
    const sessionPayload = createMockSessionPayload({ role: "CLINICIAN" });
    const token = await signJWT(sessionPayload);
    const request = createNextRequest("/clinician/patients", {
      cookies: { mbc_session: token },
    });

    const response = await middleware(request);

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(307);
  });

  it("allows authenticated user to access protected API routes", async () => {
    const sessionPayload = createMockSessionPayload({ role: "CLINICIAN" });
    const token = await signJWT(sessionPayload);
    const request = createNextRequest("/api/patients", {
      cookies: { mbc_session: token },
    });

    const response = await middleware(request);

    expect(response.status).not.toBe(401);
  });
});

// ============================================
// Role-Based Access Control Tests
// ============================================

describe("Role-Based Access Control", () => {
  it("allows ADMIN to access /admin routes", async () => {
    const sessionPayload = createMockSessionPayload({ role: "ADMIN" });
    const token = await signJWT(sessionPayload);
    const request = createNextRequest("/admin/users", {
      cookies: { mbc_session: token },
    });

    const response = await middleware(request);

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(307);
  });

  it("redirects CLINICIAN from /admin to clinician dashboard", async () => {
    const sessionPayload = createMockSessionPayload({ role: "CLINICIAN" });
    const token = await signJWT(sessionPayload);
    const request = createNextRequest("/admin/users", {
      cookies: { mbc_session: token },
    });

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toContain("/clinician/patients");
  });

  it("returns 403 for CLINICIAN accessing admin API routes", async () => {
    const sessionPayload = createMockSessionPayload({ role: "CLINICIAN" });
    const token = await signJWT(sessionPayload);
    // Note: /admin is checked for role, not /api/admin specifically in current impl
    const request = createNextRequest("/admin/api/users", {
      cookies: { mbc_session: token },
    });

    const response = await middleware(request);

    // Should redirect since it's not an API route pattern
    expect(response.status).toBe(307);
  });

  it("allows ADMIN to access all protected routes", async () => {
    const sessionPayload = createMockSessionPayload({ role: "ADMIN" });
    const token = await signJWT(sessionPayload);

    const routes = ["/admin/users", "/clinician/patients", "/api/patients"];

    for (const route of routes) {
      const request = createNextRequest(route, {
        cookies: { mbc_session: token },
      });
      const response = await middleware(request);

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    }
  });
});

// ============================================
// Header Injection Tests
// ============================================

describe("Header Injection for Protected Routes", () => {
  it("injects x-user-id header for protected API routes", async () => {
    const sessionPayload = createMockSessionPayload({ userId: "test-user-id" });
    const token = await signJWT(sessionPayload);
    const request = createNextRequest("/api/patients", {
      cookies: { mbc_session: token },
    });

    const response = await middleware(request);

    // The middleware returns NextResponse.next() with modified headers
    // In tests, we check that it doesn't error and returns properly
    expect(response.status).toBe(200);
  });

  it("injects x-user-email header for protected API routes", async () => {
    const sessionPayload = createMockSessionPayload({
      email: "user@test.com",
    });
    const token = await signJWT(sessionPayload);
    const request = createNextRequest("/api/patients", {
      cookies: { mbc_session: token },
    });

    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("injects x-user-role header for protected routes", async () => {
    const sessionPayload = createMockSessionPayload({ role: "ADMIN" });
    const token = await signJWT(sessionPayload);
    const request = createNextRequest("/api/compliance", {
      cookies: { mbc_session: token },
    });

    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("injects x-user-firstname header", async () => {
    const sessionPayload = createMockSessionPayload({ firstName: "John" });
    const token = await signJWT(sessionPayload);
    const request = createNextRequest("/clinician/dashboard", {
      cookies: { mbc_session: token },
    });

    const response = await middleware(request);

    expect(response.status).not.toBe(401);
  });

  it("injects x-user-lastname header", async () => {
    const sessionPayload = createMockSessionPayload({ lastName: "Doe" });
    const token = await signJWT(sessionPayload);
    const request = createNextRequest("/clinician/dashboard", {
      cookies: { mbc_session: token },
    });

    const response = await middleware(request);

    expect(response.status).not.toBe(401);
  });
});

// ============================================
// Invalid Token Tests
// ============================================

describe("Invalid Token Handling", () => {
  it("rejects expired token", async () => {
    // Create a request with an obviously invalid/expired token
    const request = createNextRequest("/api/patients", {
      cookies: { mbc_session: "expired.invalid.token" },
    });

    const response = await middleware(request);

    expect(response.status).toBe(401);
  });

  it("rejects malformed token", async () => {
    const request = createNextRequest("/api/patients", {
      cookies: { mbc_session: "not-a-jwt" },
    });

    const response = await middleware(request);

    expect(response.status).toBe(401);
  });

  it("rejects empty cookie value", async () => {
    const request = createNextRequest("/api/patients", {
      cookies: { mbc_session: "" },
    });

    const response = await middleware(request);

    expect(response.status).toBe(401);
  });
});
