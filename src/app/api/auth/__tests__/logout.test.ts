/**
 * Logout API Tests
 * Tests for the POST /api/auth/logout endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../logout/route";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  clearSessionCookie: vi.fn(),
}));

import { clearSessionCookie } from "@/lib/auth";

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears the session cookie", async () => {
    vi.mocked(clearSessionCookie).mockResolvedValue(undefined);

    await POST();

    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it("returns success response", async () => {
    vi.mocked(clearSessionCookie).mockResolvedValue(undefined);

    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
