/**
 * Manual Send Notification Endpoint
 * Allows clinicians to manually send assessment links to patients via email or SMS.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMagicLinkEmail, sendMagicLinkSms } from "@/lib/notifications";
import { audit } from "@/lib/audit";

interface SendNotificationRequest {
  instanceId: string;
  channel: "email" | "sms";
}

export async function POST(request: NextRequest) {
  try {
    const body: SendNotificationRequest = await request.json();
    const { instanceId, channel } = body;

    if (!instanceId) {
      return NextResponse.json(
        { error: "instanceId is required" },
        { status: 400 }
      );
    }

    if (channel !== "email" && channel !== "sms") {
      return NextResponse.json(
        { error: "Channel must be 'email' or 'sms'" },
        { status: 400 }
      );
    }

    // Fetch the measure instance with patient and measure info
    const instance = await prisma.measureInstance.findUnique({
      where: { id: instanceId },
      include: {
        patient: true,
        measure: true,
      },
    });

    if (!instance) {
      return NextResponse.json(
        { error: "Measure instance not found" },
        { status: 404 }
      );
    }

    // Check if patient has the required contact info
    if (channel === "email" && !instance.patient.email) {
      return NextResponse.json(
        { error: "Patient does not have an email address" },
        { status: 400 }
      );
    }

    if (channel === "sms" && !instance.patient.phone) {
      return NextResponse.json(
        { error: "Patient does not have a phone number" },
        { status: 400 }
      );
    }

    // Check if instance is in a sendable state
    if (instance.status === "COMPLETED" || instance.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Cannot send notification for ${instance.status} instance` },
        { status: 400 }
      );
    }

    if (instance.status === "EXPIRED") {
      return NextResponse.json(
        { error: "Cannot send notification for expired instance" },
        { status: 400 }
      );
    }

    // Build the magic link URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const magicLinkUrl = `${appUrl}/q/${instance.token}`;

    // Send via the appropriate channel
    let result: { success: boolean; messageId?: string; error?: string };

    if (channel === "email") {
      result = await sendMagicLinkEmail({
        patientFirstName: instance.patient.firstName,
        patientEmail: instance.patient.email!,
        measureName: instance.measure.name,
        dueDate: instance.dueDate,
        magicLinkUrl,
        expiresAt: instance.expiresAt,
      });
    } else {
      result = await sendMagicLinkSms({
        patientFirstName: instance.patient.firstName,
        patientPhone: instance.patient.phone!,
        measureName: instance.measure.name,
        magicLinkUrl,
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: `Failed to send ${channel}: ${result.error}` },
        { status: 500 }
      );
    }

    // Update instance status to SENT
    await prisma.measureInstance.update({
      where: { id: instanceId },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    // Log audit event
    await audit.linkSent({
      patientId: instance.patientId,
      resourceType: "MeasureInstance",
      resourceId: instanceId,
      metadata: {
        channel,
        messageId: result.messageId,
        ...(channel === "email"
          ? { recipientEmail: instance.patient.email }
          : { recipientPhone: instance.patient.phone }),
      },
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      instanceId,
      status: "SENT",
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
