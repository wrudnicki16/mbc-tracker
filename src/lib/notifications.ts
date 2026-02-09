/**
 * Email Notification Service
 * Sends magic link emails to patients for completing assessments.
 * Uses Resend in production, FakeEmailProvider for local testing.
 */

import { Resend } from "resend";

// ============================================
// Types
// ============================================

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MagicLinkEmailData {
  patientFirstName: string;
  patientEmail: string;
  measureName: string;
  dueDate: Date;
  magicLinkUrl: string;
  expiresAt: Date;
}

// ============================================
// Email Provider Interface
// ============================================

export interface EmailProvider {
  sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<EmailResult>;
}

// ============================================
// Resend Provider (Production)
// ============================================

export class ResendEmailProvider implements EmailProvider {
  private client: Resend;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.client = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<EmailResult> {
    try {
      console.log("Resend: Sending email...", {
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
      });
      const { data, error } = await this.client.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      if (error) {
        console.error("Resend API error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (err) {
      console.error("Resend send failed:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: message };
    }
  }
}

// ============================================
// Fake Provider (Local Testing)
// ============================================

export class FakeEmailProvider implements EmailProvider {
  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<EmailResult> {
    const messageId = `fake-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    console.log("\n========================================");
    console.log("📧 FAKE EMAIL SENT (No RESEND_API_KEY)");
    console.log("========================================");
    console.log(`To: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log(`Message ID: ${messageId}`);
    console.log("----------------------------------------");
    console.log("HTML Preview (first 500 chars):");
    console.log(params.html.slice(0, 500) + "...");
    console.log("========================================\n");

    return { success: true, messageId };
  }
}

// ============================================
// Email Template Generator
// ============================================

export function generateMagicLinkEmailTemplate(data: MagicLinkEmailData): {
  subject: string;
  html: string;
} {
  const formattedDueDate = data.dueDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedExpiry = data.expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `Complete Your ${data.measureName} Assessment`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">MBC Tracker</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.5;">
                Hi ${data.patientFirstName},
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.5;">
                Your clinician has requested that you complete a <strong>${data.measureName}</strong> assessment.
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #333333; line-height: 1.5;">
                <strong>Due date:</strong> ${formattedDueDate}
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <a href="${data.magicLinkUrl}"
                       style="display: inline-block; padding: 16px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Complete Assessment
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; font-size: 14px; color: #666666; line-height: 1.5;">
                This link will expire on ${formattedExpiry}. If you have any questions, please contact your clinician.
              </p>

              <p style="margin: 20px 0 0; font-size: 12px; color: #999999; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${data.magicLinkUrl}" style="color: #2563eb; word-break: break-all;">${data.magicLinkUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                This is an automated message from MBC Tracker. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

// ============================================
// Email Provider Factory
// ============================================

let emailProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (emailProvider) {
    return emailProvider;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "MBC Tracker <noreply@example.com>";

  if (apiKey) {
    emailProvider = new ResendEmailProvider(apiKey, fromEmail);
    console.log("📧 Using Resend email provider");
  } else {
    emailProvider = new FakeEmailProvider();
    console.log("📧 Using Fake email provider (set RESEND_API_KEY for real emails)");
  }

  return emailProvider;
}

// ============================================
// Main Send Function
// ============================================

export async function sendMagicLinkEmail(
  data: MagicLinkEmailData
): Promise<EmailResult> {
  const provider = getEmailProvider();
  const { subject, html } = generateMagicLinkEmailTemplate(data);

  return provider.sendEmail({
    to: data.patientEmail,
    subject,
    html,
  });
}
