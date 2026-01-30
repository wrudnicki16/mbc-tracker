/**
 * Patients API
 * CRUD operations for patients.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createIntakeAssessments } from "@/lib/scheduling";

// GET: List patients
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clinicianId = searchParams.get("clinicianId");
  const search = searchParams.get("search");
  const activeOnly = searchParams.get("activeOnly") !== "false";

  const where: Record<string, unknown> = {};

  if (clinicianId) {
    where.clinicianId = clinicianId;
  }

  if (activeOnly) {
    where.isActive = true;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { externalId: { contains: search, mode: "insensitive" } },
    ];
  }

  const patients = await prisma.patient.findMany({
    where,
    include: {
      clinician: {
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      _count: {
        select: {
          measureInstances: true,
          appointments: true,
        },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return NextResponse.json({
    count: patients.length,
    patients: patients.map((p) => ({
      id: p.id,
      externalId: p.externalId,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      intakeDate: p.intakeDate,
      isActive: p.isActive,
      clinician: {
        id: p.clinicianId,
        name: `${p.clinician.user.firstName} ${p.clinician.user.lastName}`,
      },
      counts: {
        assessments: p._count.measureInstances,
        appointments: p._count.appointments,
      },
    })),
  });
}

// POST: Create patient
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { firstName, lastName, email, phone, dateOfBirth, externalId, clinicianId, userId } =
    body;

  if (!firstName || !lastName || !clinicianId) {
    return NextResponse.json(
      { error: "firstName, lastName, and clinicianId are required" },
      { status: 400 }
    );
  }

  const clinician = await prisma.clinician.findUnique({
    where: { id: clinicianId },
  });

  if (!clinician) {
    return NextResponse.json(
      { error: "Clinician not found" },
      { status: 404 }
    );
  }

  const patient = await prisma.patient.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      externalId,
      clinicianId,
    },
  });

  await audit.patientCreated({
    userId,
    patientId: patient.id,
    resourceType: "Patient",
    resourceId: patient.id,
    metadata: { clinicianId },
  });

  const instances = await createIntakeAssessments(patient.id, userId);

  return NextResponse.json({
    patient: {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      externalId: patient.externalId,
    },
    intakeAssessments: instances.length,
  });
}
