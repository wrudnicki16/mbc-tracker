/**
 * Cron Endpoint: Send Pending Notifications
 * Batch sends email notifications for assessments due within 1 day.
 * Can be triggered manually or via cron job.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/notifications";
import { audit } from "@/lib/audit";

interface SendResult {
  instanceId: string;
  patientId: string;
  measureName: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  return handleSendNotifications(request);
}

export async function GET(request: NextRequest) {
  return handleSendNotifications(request);
}

async function handleSendNotifications(request: NextRequest) {
  // Optional: Add API key verification for production
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find PENDING instances with due dates within 1 day
    // Only for patients that have email addresses
    const pendingInstances = await prisma.measureInstance.findMany({
      where: {
        status: "PENDING",
        dueDate: {
          lte: oneDayFromNow,
        },
        patient: {
          email: {
            not: null,
          },
        },
      },
      include: {
        patient: true,
        measure: true,
      },
    });

    const results: SendResult[] = [];

    for (const instance of pendingInstances) {
      // Skip if patient has no email (defensive check)
      if (!instance.patient.email) {
        continue;
      }

      const magicLinkUrl = `${appUrl}/q/${instance.token}`;

      const result = await sendMagicLinkEmail({
        patientFirstName: instance.patient.firstName,
        patientEmail: instance.patient.email,
        measureName: instance.measure.name,
        dueDate: instance.dueDate,
        magicLinkUrl,
        expiresAt: instance.expiresAt,
      });

      if (result.success) {
        // Update instance status to SENT
        await prisma.measureInstance.update({
          where: { id: instance.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });

        // Log audit event
        await audit.linkSent({
          patientId: instance.patientId,
          resourceType: "MeasureInstance",
          resourceId: instance.id,
          metadata: {
            channel: "email",
            messageId: result.messageId,
            recipientEmail: instance.patient.email,
            source: "cron",
          },
        });

        results.push({
          instanceId: instance.id,
          patientId: instance.patientId,
          measureName: instance.measure.name,
          success: true,
          messageId: result.messageId,
        });
      } else {
        results.push({
          instanceId: instance.id,
          patientId: instance.patientId,
          measureName: instance.measure.name,
          success: false,
          error: result.error,
        });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: pendingInstances.length,
        sent,
        failed,
      },
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron send-notifications failed:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
