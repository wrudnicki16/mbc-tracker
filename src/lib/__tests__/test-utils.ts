/**
 * Test Utilities
 * Shared mocking helpers for unit tests
 */

import { vi } from "vitest";

// ============================================
// Types
// ============================================

export interface MockCookieStore {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

export interface MockNextRequest {
  headers: Headers;
  cookies: {
    get: (name: string) => { value: string } | undefined;
  };
  nextUrl: {
    pathname: string;
    searchParams: URLSearchParams;
  };
  url: string;
  json: () => Promise<unknown>;
}

// ============================================
// Mock Cookie Store
// ============================================

export function createMockCookieStore(
  values: Record<string, string> = {}
): MockCookieStore {
  return {
    get: vi.fn((name: string) => {
      const value = values[name];
      return value !== undefined ? { value } : undefined;
    }),
    set: vi.fn(),
    delete: vi.fn(),
  };
}

// ============================================
// Mock Next.js Request
// ============================================

export function createMockNextRequest(
  path: string,
  options: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    method?: string;
    body?: unknown;
  } = {}
): MockNextRequest {
  const headers = new Headers(options.headers || {});
  const cookies = options.cookies || {};

  return {
    headers,
    cookies: {
      get: (name: string) => {
        const value = cookies[name];
        return value !== undefined ? { value } : undefined;
      },
    },
    nextUrl: {
      pathname: path,
      searchParams: new URLSearchParams(),
    },
    url: `http://localhost:3000${path}`,
    json: async () => options.body,
  };
}

// ============================================
// Mock Login Request
// ============================================

export function createMockLoginRequest(body: {
  email?: string;
  password?: string;
}): MockNextRequest {
  return createMockNextRequest("/api/auth/login", {
    method: "POST",
    body,
  });
}

// ============================================
// Mock Session Payload
// ============================================

export function createMockSessionPayload(
  overrides: Partial<{
    userId: string;
    email: string;
    role: "ADMIN" | "CLINICIAN";
    firstName: string;
    lastName: string;
  }> = {}
) {
  return {
    userId: "user-123",
    email: "test@example.com",
    role: "CLINICIAN" as const,
    firstName: "Test",
    lastName: "User",
    ...overrides,
  };
}

// ============================================
// Mock User
// ============================================

export function createMockUser(
  overrides: Partial<{
    id: string;
    email: string;
    passwordHash: string;
    role: "ADMIN" | "CLINICIAN";
    firstName: string;
    lastName: string;
  }> = {}
) {
  return {
    id: "user-123",
    email: "test@example.com",
    passwordHash: "$2a$10$mockhashedpassword",
    role: "CLINICIAN" as const,
    firstName: "Test",
    lastName: "User",
    ...overrides,
  };
}

// ============================================
// Headers Assertion Helpers
// ============================================

export function expectHeader(
  headers: Headers,
  name: string,
  expectedValue: string
) {
  const value = headers.get(name);
  if (value !== expectedValue) {
    throw new Error(
      `Expected header "${name}" to be "${expectedValue}", got "${value}"`
    );
  }
}
