/**
 * Auth Utilities Tests
 * Tests for JWT signing/verification, password hashing, and session management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  signJWT,
  verifyJWT,
  verifyPassword,
  hashPassword,
  getAuthenticatedUser,
  SessionPayload,
} from "../auth";
import {
  createMockNextRequest,
  createMockSessionPayload,
} from "./test-utils";

// ============================================
// signJWT Tests
// ============================================

describe("signJWT", () => {
  const payload = createMockSessionPayload();

  it("creates a valid JWT token string", async () => {
    const token = await signJWT(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });

  it("includes all payload fields in the token", async () => {
    const token = await signJWT(payload);
    const verified = await verifyJWT(token);

    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.role).toBe(payload.role);
    expect(verified?.firstName).toBe(payload.firstName);
    expect(verified?.lastName).toBe(payload.lastName);
  });

  it("sets expiration on the token", async () => {
    const token = await signJWT(payload);
    const verified = await verifyJWT(token);

    expect(verified).not.toBeNull();
    expect(verified?.exp).toBeDefined();
    // Expiration should be in the future
    expect(verified!.exp!).toBeGreaterThan(Date.now() / 1000);
  });

  it("sets issued at timestamp", async () => {
    const beforeTime = Math.floor(Date.now() / 1000);
    const token = await signJWT(payload);
    const verified = await verifyJWT(token);

    expect(verified?.iat).toBeDefined();
    expect(verified!.iat!).toBeGreaterThanOrEqual(beforeTime);
  });

  it("creates different tokens for different payloads", async () => {
    const payload1 = createMockSessionPayload({ userId: "user-1" });
    const payload2 = createMockSessionPayload({ userId: "user-2" });

    const token1 = await signJWT(payload1);
    const token2 = await signJWT(payload2);

    expect(token1).not.toBe(token2);
  });
});

// ============================================
// verifyJWT Tests
// ============================================

describe("verifyJWT", () => {
  const payload = createMockSessionPayload();

  it("returns payload for valid token", async () => {
    const token = await signJWT(payload);
    const result = await verifyJWT(token);

    expect(result).not.toBeNull();
    expect(result?.userId).toBe(payload.userId);
    expect(result?.email).toBe(payload.email);
  });

  it("returns null for malformed token", async () => {
    const result = await verifyJWT("not.a.valid.token");
    expect(result).toBeNull();
  });

  it("returns null for empty token", async () => {
    const result = await verifyJWT("");
    expect(result).toBeNull();
  });

  it("returns null for token with invalid signature", async () => {
    const token = await signJWT(payload);
    // Tamper with the signature
    const parts = token.split(".");
    parts[2] = "invalidsignature";
    const tamperedToken = parts.join(".");

    const result = await verifyJWT(tamperedToken);
    expect(result).toBeNull();
  });

  it("returns null for completely random string", async () => {
    const result = await verifyJWT("random-garbage-string");
    expect(result).toBeNull();
  });
});

// ============================================
// verifyPassword Tests
// ============================================

describe("verifyPassword", () => {
  it("returns true for matching password", async () => {
    const password = "SecurePassword123!";
    const hash = await hashPassword(password);

    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const password = "SecurePassword123!";
    const wrongPassword = "WrongPassword456!";
    const hash = await hashPassword(password);

    const result = await verifyPassword(wrongPassword, hash);
    expect(result).toBe(false);
  });

  it("returns false for empty password against valid hash", async () => {
    const password = "SecurePassword123!";
    const hash = await hashPassword(password);

    const result = await verifyPassword("", hash);
    expect(result).toBe(false);
  });

  it("handles special characters in password", async () => {
    const password = "P@$$w0rd!#$%^&*()";
    const hash = await hashPassword(password);

    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });
});

// ============================================
// hashPassword Tests
// ============================================

describe("hashPassword", () => {
  it("returns a bcrypt hash string", async () => {
    const password = "SecurePassword123!";
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    // bcrypt hashes start with $2a$ or $2b$
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it("hash verifies with verifyPassword", async () => {
    const password = "TestPassword789!";
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("creates different hashes for same password (due to salt)", async () => {
    const password = "SamePassword";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
    // But both should verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it("handles empty password", async () => {
    const hash = await hashPassword("");
    expect(hash).toBeDefined();
    expect(await verifyPassword("", hash)).toBe(true);
  });

  it("handles unicode characters", async () => {
    const password = "密码パスワード🔐";
    const hash = await hashPassword(password);

    expect(await verifyPassword(password, hash)).toBe(true);
  });
});

// ============================================
// getAuthenticatedUser Tests
// ============================================

describe("getAuthenticatedUser", () => {
  const sessionPayload = createMockSessionPayload();

  it("returns user data from headers when present", async () => {
    const request = createMockNextRequest("/api/test", {
      headers: {
        "x-user-id": sessionPayload.userId,
        "x-user-email": sessionPayload.email,
        "x-user-role": sessionPayload.role,
        "x-user-firstname": sessionPayload.firstName,
        "x-user-lastname": sessionPayload.lastName,
      },
    });

    const result = await getAuthenticatedUser(request as any);

    expect(result).not.toBeNull();
    expect(result?.userId).toBe(sessionPayload.userId);
    expect(result?.email).toBe(sessionPayload.email);
    expect(result?.role).toBe(sessionPayload.role);
    expect(result?.firstName).toBe(sessionPayload.firstName);
    expect(result?.lastName).toBe(sessionPayload.lastName);
  });

  it("falls back to cookie when headers missing", async () => {
    const token = await signJWT(sessionPayload);
    const request = createMockNextRequest("/api/test", {
      cookies: { mbc_session: token },
    });

    const result = await getAuthenticatedUser(request as any);

    expect(result).not.toBeNull();
    expect(result?.userId).toBe(sessionPayload.userId);
    expect(result?.email).toBe(sessionPayload.email);
  });

  it("returns null when no headers and no cookie", async () => {
    const request = createMockNextRequest("/api/test");

    const result = await getAuthenticatedUser(request as any);

    expect(result).toBeNull();
  });

  it("returns null when headers are partial", async () => {
    const request = createMockNextRequest("/api/test", {
      headers: {
        "x-user-id": sessionPayload.userId,
        // Missing other required headers
      },
    });

    const result = await getAuthenticatedUser(request as any);

    expect(result).toBeNull();
  });

  it("returns null when cookie contains invalid token", async () => {
    const request = createMockNextRequest("/api/test", {
      cookies: { mbc_session: "invalid-token" },
    });

    const result = await getAuthenticatedUser(request as any);

    expect(result).toBeNull();
  });

  it("prefers headers over cookie when both present", async () => {
    const headerUser = createMockSessionPayload({ userId: "header-user" });
    const cookieUser = createMockSessionPayload({ userId: "cookie-user" });
    const token = await signJWT(cookieUser);

    const request = createMockNextRequest("/api/test", {
      headers: {
        "x-user-id": headerUser.userId,
        "x-user-email": headerUser.email,
        "x-user-role": headerUser.role,
        "x-user-firstname": headerUser.firstName,
        "x-user-lastname": headerUser.lastName,
      },
      cookies: { mbc_session: token },
    });

    const result = await getAuthenticatedUser(request as any);

    expect(result?.userId).toBe("header-user");
  });
});
