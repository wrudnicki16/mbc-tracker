/**
 * Notifications Tests
 * Tests for email/SMS template generators and fake providers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateMagicLinkEmailTemplate,
  generateMagicLinkSmsBody,
  FakeEmailProvider,
  FakeSmsProvider,
  MagicLinkEmailData,
  MagicLinkSmsData,
} from "../notifications";

// ============================================
// generateMagicLinkEmailTemplate Tests
// ============================================

describe("generateMagicLinkEmailTemplate", () => {
  // Use explicit local time to avoid timezone issues
  const dueDate = new Date(2024, 2, 15, 12, 0, 0); // March 15, 2024 noon local time
  const expiresAt = new Date(2024, 2, 22, 12, 0, 0); // March 22, 2024 noon local time

  const baseData: MagicLinkEmailData = {
    patientFirstName: "John",
    patientEmail: "john@example.com",
    measureName: "PHQ-9",
    dueDate,
    magicLinkUrl: "https://example.com/q/abc123",
    expiresAt,
  };

  it("includes measure name in subject", () => {
    const { subject } = generateMagicLinkEmailTemplate(baseData);

    expect(subject).toContain("PHQ-9");
    expect(subject).toContain("Assessment");
  });

  it("includes patient name in HTML body", () => {
    const { html } = generateMagicLinkEmailTemplate(baseData);

    expect(html).toContain("Hi John");
  });

  it("includes magic link URL in HTML body", () => {
    const { html } = generateMagicLinkEmailTemplate(baseData);

    expect(html).toContain("https://example.com/q/abc123");
  });

  it("includes formatted due date in HTML body", () => {
    const { html } = generateMagicLinkEmailTemplate(baseData);

    // Should contain the formatted due date
    const formattedDueDate = dueDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(html).toContain(formattedDueDate);
  });

  it("includes formatted expiry date in HTML body", () => {
    const { html } = generateMagicLinkEmailTemplate(baseData);

    // Should contain the formatted expiry date
    const formattedExpiry = expiresAt.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(html).toContain(formattedExpiry);
  });

  it("includes measure name in HTML body", () => {
    const { html } = generateMagicLinkEmailTemplate(baseData);

    expect(html).toContain("PHQ-9");
  });

  it("includes call-to-action button", () => {
    const { html } = generateMagicLinkEmailTemplate(baseData);

    expect(html).toContain("Complete Assessment");
  });

  it("returns valid HTML structure", () => {
    const { html } = generateMagicLinkEmailTemplate(baseData);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
  });

  it("handles different measure names", () => {
    const gadData = { ...baseData, measureName: "GAD-7" };
    const { subject, html } = generateMagicLinkEmailTemplate(gadData);

    expect(subject).toContain("GAD-7");
    expect(html).toContain("GAD-7");
  });

  it("handles special characters in patient name", () => {
    const specialData = { ...baseData, patientFirstName: "María" };
    const { html } = generateMagicLinkEmailTemplate(specialData);

    expect(html).toContain("Hi María");
  });
});

// ============================================
// generateMagicLinkSmsBody Tests
// ============================================

describe("generateMagicLinkSmsBody", () => {
  const baseData: MagicLinkSmsData = {
    patientFirstName: "John",
    patientPhone: "+15555551234",
    measureName: "PHQ-9",
    magicLinkUrl: "https://example.com/q/abc123",
  };

  it("includes patient name", () => {
    const body = generateMagicLinkSmsBody(baseData);

    expect(body).toContain("Hi John");
  });

  it("includes measure name", () => {
    const body = generateMagicLinkSmsBody(baseData);

    expect(body).toContain("PHQ-9");
  });

  it("includes magic link URL", () => {
    const body = generateMagicLinkSmsBody(baseData);

    expect(body).toContain("https://example.com/q/abc123");
  });

  it("handles different measure names", () => {
    const gadData = { ...baseData, measureName: "GAD-7" };
    const body = generateMagicLinkSmsBody(gadData);

    expect(body).toContain("GAD-7");
  });

  it("handles special characters in patient name", () => {
    const specialData = { ...baseData, patientFirstName: "José" };
    const body = generateMagicLinkSmsBody(specialData);

    expect(body).toContain("Hi José");
  });
});

// ============================================
// FakeEmailProvider Tests
// ============================================

describe("FakeEmailProvider", () => {
  let provider: FakeEmailProvider;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new FakeEmailProvider();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("returns success result", async () => {
    const result = await provider.sendEmail({
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Test HTML</p>",
    });

    expect(result.success).toBe(true);
  });

  it("returns a fake message ID", async () => {
    const result = await provider.sendEmail({
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Test HTML</p>",
    });

    expect(result.messageId).toBeDefined();
    expect(result.messageId).toContain("fake-");
  });

  it("generates unique message IDs", async () => {
    const result1 = await provider.sendEmail({
      to: "test@example.com",
      subject: "Test 1",
      html: "<p>HTML 1</p>",
    });
    const result2 = await provider.sendEmail({
      to: "test@example.com",
      subject: "Test 2",
      html: "<p>HTML 2</p>",
    });

    expect(result1.messageId).not.toBe(result2.messageId);
  });

  it("logs email details to console", async () => {
    await provider.sendEmail({
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Test HTML</p>",
    });

    expect(consoleSpy).toHaveBeenCalled();
  });
});

// ============================================
// FakeSmsProvider Tests
// ============================================

describe("FakeSmsProvider", () => {
  let provider: FakeSmsProvider;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new FakeSmsProvider();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("returns success result", async () => {
    const result = await provider.sendSms({
      to: "+15555551234",
      body: "Test message",
    });

    expect(result.success).toBe(true);
  });

  it("returns a fake message ID", async () => {
    const result = await provider.sendSms({
      to: "+15555551234",
      body: "Test message",
    });

    expect(result.messageId).toBeDefined();
    expect(result.messageId).toContain("fake-sms-");
  });

  it("generates unique message IDs", async () => {
    const result1 = await provider.sendSms({
      to: "+15555551234",
      body: "Message 1",
    });
    const result2 = await provider.sendSms({
      to: "+15555551234",
      body: "Message 2",
    });

    expect(result1.messageId).not.toBe(result2.messageId);
  });

  it("logs SMS details to console", async () => {
    await provider.sendSms({
      to: "+15555551234",
      body: "Test message",
    });

    expect(consoleSpy).toHaveBeenCalled();
  });
});
