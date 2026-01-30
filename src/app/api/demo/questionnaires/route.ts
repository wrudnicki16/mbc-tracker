/**
 * Demo API - List all questionnaire instances
 * For testing purposes only.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const instances = await prisma.measureInstance.findMany({
    include: {
      measure: {
        select: { name: true },
      },
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ patient: { lastName: "asc" } }, { measure: { name: "asc" } }],
  });

  return NextResponse.json({
    instances: instances.map((instance) => ({
      id: instance.id,
      token: instance.token,
      status: instance.status,
      measureName: instance.measure.name,
      dueDate: instance.dueDate.toISOString(),
      patientId: instance.patient.id,
      patientName: `${instance.patient.firstName} ${instance.patient.lastName}`,
    })),
  });
}
