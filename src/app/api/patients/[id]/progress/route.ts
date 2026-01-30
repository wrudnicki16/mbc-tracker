/**
 * Patient Progress API (Step 9)
 * Returns assessment history and trends for clinician view.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: patientId } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      clinician: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Get all completed responses with measure info
  const responses = await prisma.measureResponse.findMany({
    where: {
      measureInstance: {
        patientId,
        status: "COMPLETED",
      },
    },
    include: {
      measureInstance: {
        include: {
          measure: true,
          appointment: true,
        },
      },
    },
    orderBy: { completedAt: "asc" },
  });

  // Get appointments for timeline markers
  const appointments = await prisma.appointment.findMany({
    where: { patientId },
    orderBy: { scheduledAt: "asc" },
  });

  // Group responses by measure
  const phq9Data = responses
    .filter((r) => r.measureInstance.measure.name === "PHQ-9")
    .map((r) => ({
      date: r.completedAt,
      score: r.totalScore,
      severityBand: r.severityBand,
      appointmentId: r.measureInstance.appointmentId,
    }));

  const gad7Data = responses
    .filter((r) => r.measureInstance.measure.name === "GAD-7")
    .map((r) => ({
      date: r.completedAt,
      score: r.totalScore,
      severityBand: r.severityBand,
      appointmentId: r.measureInstance.appointmentId,
    }));

  // Calculate trends
  const phq9Trend = calculateTrend(phq9Data.map((d) => d.score));
  const gad7Trend = calculateTrend(gad7Data.map((d) => d.score));

  // Get pending assessments
  const pending = await prisma.measureInstance.findMany({
    where: {
      patientId,
      status: { in: ["PENDING", "SENT", "STARTED"] },
    },
    include: { measure: true },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({
    patient: {
      id: patient.id,
      name: `${patient.firstName} ${patient.lastName}`,
      intakeDate: patient.intakeDate,
      clinician: `${patient.clinician.user.firstName} ${patient.clinician.user.lastName}`,
    },
    charts: {
      phq9: {
        data: phq9Data,
        trend: phq9Trend,
        latestScore: phq9Data.length > 0 ? phq9Data[phq9Data.length - 1].score : null,
        latestBand: phq9Data.length > 0 ? phq9Data[phq9Data.length - 1].severityBand : null,
      },
      gad7: {
        data: gad7Data,
        trend: gad7Trend,
        latestScore: gad7Data.length > 0 ? gad7Data[gad7Data.length - 1].score : null,
        latestBand: gad7Data.length > 0 ? gad7Data[gad7Data.length - 1].severityBand : null,
      },
    },
    appointments: appointments.map((a) => ({
      id: a.id,
      date: a.scheduledAt,
      completed: !!a.completedAt,
      cancelled: a.isCancelled,
    })),
    pendingAssessments: pending.map((p) => ({
      id: p.id,
      measure: p.measure.name,
      dueDate: p.dueDate,
      status: p.status,
      token: p.token,
    })),
    responseCount: responses.length,
  });
}

function calculateTrend(scores: number[]): "improving" | "stable" | "worsening" | "insufficient" {
  if (scores.length < 2) return "insufficient";

  const recent = scores.slice(-3);
  if (recent.length < 2) return "insufficient";

  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgPrevious = scores.slice(0, -3).length > 0
    ? scores.slice(0, -3).reduce((a, b) => a + b, 0) / scores.slice(0, -3).length
    : recent[0];

  const diff = avgRecent - avgPrevious;

  if (Math.abs(diff) < 2) return "stable";
  return diff < 0 ? "improving" : "worsening";
}
