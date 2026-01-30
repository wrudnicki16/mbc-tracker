/**
 * Questionnaire API (Steps 7-8)
 * Handles magic link questionnaire access and submission.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scoreMeasure } from "@/lib/scoring";
import { audit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET: Load questionnaire by token
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const instance = await prisma.measureInstance.findUnique({
    where: { token },
    include: {
      measure: {
        include: {
          questions: {
            orderBy: { questionNum: "asc" },
          },
        },
      },
      patient: {
        select: { firstName: true },
      },
    },
  });

  if (!instance) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  if (instance.status === "COMPLETED") {
    return NextResponse.json(
      { error: "This questionnaire has already been completed" },
      { status: 400 }
    );
  }

  if (instance.status === "EXPIRED" || instance.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This link has expired" },
      { status: 400 }
    );
  }

  // Mark as started if first access
  if (instance.status === "PENDING" || instance.status === "SENT") {
    await prisma.measureInstance.update({
      where: { id: instance.id },
      data: {
        status: "STARTED",
        startedAt: new Date(),
      },
    });

    await audit.questionnaireStarted({
      patientId: instance.patientId,
      resourceType: "MeasureInstance",
      resourceId: instance.id,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });
  }

  return NextResponse.json({
    instanceId: instance.id,
    measureName: instance.measure.name,
    measureDescription: instance.measure.description,
    patientFirstName: instance.patient.firstName,
    questions: instance.measure.questions.map((q) => ({
      questionNum: q.questionNum,
      questionText: q.questionText,
      minValue: q.minValue,
      maxValue: q.maxValue,
    })),
  });
}

// POST: Submit questionnaire answers
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const instance = await prisma.measureInstance.findUnique({
    where: { token },
    include: {
      measure: true,
    },
  });

  if (!instance) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  if (instance.status === "COMPLETED") {
    return NextResponse.json(
      { error: "This questionnaire has already been completed" },
      { status: 400 }
    );
  }

  if (instance.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This link has expired" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { answers } = body;

  if (!answers || !Array.isArray(answers)) {
    return NextResponse.json(
      { error: "Invalid answers format" },
      { status: 400 }
    );
  }

  // Score the assessment
  let scoringResult;
  try {
    scoringResult = scoreMeasure(instance.measure.name, answers);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scoring failed" },
      { status: 400 }
    );
  }

  // Create response and update instance in transaction
  const result = await prisma.$transaction(async (tx) => {
    const response = await tx.measureResponse.create({
      data: {
        measureInstanceId: instance.id,
        answers,
        totalScore: scoringResult.totalScore,
        severityBand: scoringResult.severityBand,
      },
    });

    await tx.measureInstance.update({
      where: { id: instance.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return response;
  });

  // Log audit events
  await audit.questionnaireSubmitted({
    patientId: instance.patientId,
    resourceType: "MeasureResponse",
    resourceId: result.id,
    metadata: {
      measureName: instance.measure.name,
      totalScore: scoringResult.totalScore,
      severityBand: scoringResult.severityBand,
    },
    ipAddress: request.headers.get("x-forwarded-for") || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  });

  await audit.scoreComputed({
    patientId: instance.patientId,
    resourceType: "MeasureResponse",
    resourceId: result.id,
    metadata: {
      totalScore: scoringResult.totalScore,
      severityBand: scoringResult.severityBand,
      maxPossibleScore: scoringResult.maxPossibleScore,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Thank you for completing the questionnaire",
  });
}
