/**
 * Manual Send Notification Endpoint
 * Allows clinicians to manually send assessment links to patients via email.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/notifications";
import { audit } from "@/lib/audit";

interface SendNotificationRequest {
  instanceId: string;
  channel: "email";
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

    if (channel !== "email") {
      return NextResponse.json(
        { error: "Only email channel is currently supported" },
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

    // Check if patient has email
    if (!instance.patient.email) {
      return NextResponse.json(
        { error: "Patient does not have an email address" },
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

    // Send the email
    const result = await sendMagicLinkEmail({
      patientFirstName: instance.patient.firstName,
      patientEmail: instance.patient.email,
      measureName: instance.measure.name,
      dueDate: instance.dueDate,
      magicLinkUrl,
      expiresAt: instance.expiresAt,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: `Failed to send email: ${result.error}` },
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
        channel: "email",
        messageId: result.messageId,
        recipientEmail: instance.patient.email,
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
