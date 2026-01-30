/**
 * Compliance API (Step 10)
 * Returns compliance metrics for the admin dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDueAssessments } from "@/lib/scheduling";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clinicianId = searchParams.get("clinicianId");
  const days = parseInt(searchParams.get("days") || "30", 10);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Build where clause
  const patientWhere = clinicianId ? { clinicianId } : {};

  // Get completion stats
  const [totalDue, totalCompleted, totalOverdue] = await Promise.all([
    // Total instances that were due in the period
    prisma.measureInstance.count({
      where: {
        patient: patientWhere,
        dueDate: { gte: startDate },
      },
    }),
    // Completed instances
    prisma.measureInstance.count({
      where: {
        patient: patientWhere,
        status: "COMPLETED",
        completedAt: { gte: startDate },
      },
    }),
    // Overdue (past due, not completed, not expired)
    prisma.measureInstance.count({
      where: {
        patient: patientWhere,
        status: { in: ["PENDING", "SENT", "STARTED"] },
        dueDate: { lt: new Date() },
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  // Calculate compliance rate
  const complianceRate = totalDue > 0 ? (totalCompleted / totalDue) * 100 : 100;

  // Get due and overdue lists
  const { due, overdue } = await getDueAssessments();

  // Filter by clinician if specified
  const filteredDue = clinicianId
    ? due.filter((d) => d.patient.clinicianId === clinicianId)
    : due;
  const filteredOverdue = clinicianId
    ? overdue.filter((d) => d.patient.clinicianId === clinicianId)
    : overdue;

  // Get overdue details for the list
  const overdueList = filteredOverdue.map((instance) => ({
    id: instance.id,
    patientId: instance.patientId,
    patientName: `${instance.patient.firstName} ${instance.patient.lastName}`,
    measureName: instance.measure.name,
    dueDate: instance.dueDate,
    daysPastDue: Math.floor(
      (new Date().getTime() - instance.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  return NextResponse.json({
    period: {
      startDate,
      endDate: new Date(),
      days,
    },
    metrics: {
      totalDue,
      totalCompleted,
      totalOverdue,
      complianceRate: Math.round(complianceRate * 10) / 10,
    },
    dueCount: filteredDue.length,
    overdueCount: filteredOverdue.length,
    overdueList,
  });
}
