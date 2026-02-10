/**
 * Session API Tests
 * Tests for the GET /api/auth/session endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../session/route";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/auth";

// Mock session data
const mockSession = {
  userId: "user-123",
  email: "test@example.com",
  role: "CLINICIAN" as const,
  firstName: "Test",
  lastName: "User",
};

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session exists", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.authenticated).toBe(false);
  });

  it("returns user data when authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.authenticated).toBe(true);
    expect(body.user).toBeDefined();
    expect(body.user.id).toBe(mockSession.userId);
    expect(body.user.email).toBe(mockSession.email);
    expect(body.user.firstName).toBe(mockSession.firstName);
    expect(body.user.lastName).toBe(mockSession.lastName);
    expect(body.user.role).toBe(mockSession.role);
  });

  it("does not leak session tokens in response", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);

    const response = await GET();

    const body = await response.json();
    expect(body.token).toBeUndefined();
    expect(body.user.token).toBeUndefined();
    expect(body.user.passwordHash).toBeUndefined();
  });
});
