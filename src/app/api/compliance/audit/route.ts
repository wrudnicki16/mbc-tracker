/**
 * Audit Export API (Step 11)
 * Returns audit events for compliance reporting.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const patientId = searchParams.get("patientId");
  const eventType = searchParams.get("eventType");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const format = searchParams.get("format") || "json";
  const limit = parseInt(searchParams.get("limit") || "1000", 10);

  // Build where clause
  const where: Record<string, unknown> = {};

  if (patientId) {
    where.patientId = patientId;
  }

  if (eventType) {
    where.eventType = eventType;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      (where.createdAt as Record<string, Date>).gte = new Date(startDate);
    }
    if (endDate) {
      (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }
  }

  const events = await prisma.auditEvent.findMany({
    where,
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // CSV export
  if (format === "csv") {
    const headers = [
      "Timestamp",
      "Event Type",
      "User Email",
      "Patient ID",
      "Resource Type",
      "Resource ID",
      "IP Address",
    ];

    const rows = events.map((event) => [
      event.createdAt.toISOString(),
      event.eventType,
      event.user?.email || "",
      event.patientId || "",
      event.resourceType || "",
      event.resourceId || "",
      event.ipAddress || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({
    count: events.length,
    events: events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      timestamp: event.createdAt,
      user: event.user
        ? {
            email: event.user.email,
            name: `${event.user.firstName} ${event.user.lastName}`,
          }
        : null,
      patientId: event.patientId,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      metadata: event.metadata,
      ipAddress: event.ipAddress,
    })),
  });
}
