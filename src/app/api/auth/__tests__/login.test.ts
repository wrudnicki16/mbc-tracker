/**
 * Login API Tests
 * Tests for the POST /api/auth/login endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../login/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  signJWT: vi.fn(),
  verifyPassword: vi.fn(),
  setSessionCookie: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  audit: {
    userLogin: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import { signJWT, verifyPassword, setSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";

// Helper to create mock request
function createLoginRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Mock user data
const mockUser = {
  id: "user-123",
  email: "test@example.com",
  passwordHash: "$2a$10$hashedpassword",
  role: "CLINICIAN" as const,
  firstName: "Test",
  lastName: "User",
};

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Validation Tests
  // ============================================

  describe("Validation", () => {
    it("returns 400 when email is missing", async () => {
      const request = createLoginRequest({ password: "password123" });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Email and password are required");
    });

    it("returns 400 when password is missing", async () => {
      const request = createLoginRequest({ email: "test@example.com" });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Email and password are required");
    });

    it("returns 400 when both email and password are missing", async () => {
      const request = createLoginRequest({});
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("returns 400 when email is empty string", async () => {
      const request = createLoginRequest({ email: "", password: "password" });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("returns 400 when password is empty string", async () => {
      const request = createLoginRequest({
        email: "test@example.com",
        password: "",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  // ============================================
  // Authentication Tests
  // ============================================

  describe("Authentication", () => {
    it("returns 401 for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = createLoginRequest({
        email: "nonexistent@example.com",
        password: "password123",
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Invalid credentials");
    });

    it("returns 401 for wrong password", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const request = createLoginRequest({
        email: "test@example.com",
        password: "wrongpassword",
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Invalid credentials");
    });

    it("normalizes email to lowercase for lookup", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = createLoginRequest({
        email: "TEST@EXAMPLE.COM",
        password: "password123",
      });
      await POST(request);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });
  });

  // ============================================
  // Success Tests
  // ============================================

  describe("Successful Login", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(signJWT).mockResolvedValue("mock-jwt-token");
      vi.mocked(setSessionCookie).mockResolvedValue(undefined);
      vi.mocked(audit.userLogin).mockResolvedValue(undefined);
    });

    it("returns user data on successful login", async () => {
      const request = createLoginRequest({
        email: "test@example.com",
        password: "correctpassword",
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe(mockUser.id);
      expect(body.user.email).toBe(mockUser.email);
      expect(body.user.firstName).toBe(mockUser.firstName);
      expect(body.user.lastName).toBe(mockUser.lastName);
      expect(body.user.role).toBe(mockUser.role);
    });

    it("does not return password hash in response", async () => {
      const request = createLoginRequest({
        email: "test@example.com",
        password: "correctpassword",
      });
      const response = await POST(request);

      const body = await response.json();
      expect(body.user.passwordHash).toBeUndefined();
      expect(body.user.password).toBeUndefined();
    });

    it("sets session cookie on success", async () => {
      const request = createLoginRequest({
        email: "test@example.com",
        password: "correctpassword",
      });
      await POST(request);

      expect(setSessionCookie).toHaveBeenCalledWith("mock-jwt-token");
    });

    it("logs audit event on successful login", async () => {
      const request = createLoginRequest({
        email: "test@example.com",
        password: "correctpassword",
      });
      await POST(request);

      expect(audit.userLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          metadata: { email: mockUser.email },
        })
      );
    });

    it("signs JWT with correct payload", async () => {
      const request = createLoginRequest({
        email: "test@example.com",
        password: "correctpassword",
      });
      await POST(request);

      expect(signJWT).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================

  describe("Error Handling", () => {
    it("returns 500 on database error", async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createLoginRequest({
        email: "test@example.com",
        password: "password123",
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("An error occurred during login");
    });

    it("does not leak database error details in response", async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(
        new Error("Sensitive database error with connection string")
      );

      const request = createLoginRequest({
        email: "test@example.com",
        password: "password123",
      });
      const response = await POST(request);

      const body = await response.json();
      expect(body.error).not.toContain("Sensitive");
      expect(body.error).not.toContain("connection");
    });

    it("returns generic error on JWT signing failure", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(signJWT).mockRejectedValue(new Error("JWT signing failed"));

      const request = createLoginRequest({
        email: "test@example.com",
        password: "correctpassword",
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});
