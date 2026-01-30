/**
 * Scheduling Service (Step 6)
 * Generates measure instances based on MBC policy.
 */

import { prisma } from "./db";
import { audit } from "./audit";

interface CreateInstancesOptions {
  patientId: string;
  appointmentId?: string;
  dueDate?: Date;
  userId?: string;
}

/**
 * Get the default MBC policy
 */
export async function getDefaultPolicy() {
  let policy = await prisma.mbcPolicy.findUnique({
    where: { name: "default" },
  });

  if (!policy) {
    // Create default policy if it doesn't exist
    policy = await prisma.mbcPolicy.create({
      data: {
        name: "default",
        cadenceDays: 14,
        graceWindowDays: 3,
        expirationDays: 7,
        measuresRequired: ["PHQ-9", "GAD-7"],
        requireAtIntake: true,
      },
    });
  }

  return policy;
}

/**
 * Create measure instances for a patient based on policy
 */
export async function createMeasureInstances(options: CreateInstancesOptions) {
  const { patientId, appointmentId, dueDate, userId } = options;

  const policy = await getDefaultPolicy();
  const measures = await prisma.measure.findMany({
    where: {
      name: { in: policy.measuresRequired },
    },
  });

  const effectiveDueDate = dueDate || new Date();
  const expiresAt = new Date(effectiveDueDate);
  expiresAt.setDate(expiresAt.getDate() + policy.expirationDays);

  const instances = await Promise.all(
    measures.map((measure) =>
      prisma.measureInstance.create({
        data: {
          patientId,
          measureId: measure.id,
          appointmentId,
          dueDate: effectiveDueDate,
          expiresAt,
          status: "PENDING",
        },
      })
    )
  );

  // Log audit events
  for (const instance of instances) {
    await audit.instanceCreated({
      userId,
      patientId,
      resourceType: "MeasureInstance",
      resourceId: instance.id,
      metadata: {
        measureId: instance.measureId,
        appointmentId,
        dueDate: effectiveDueDate.toISOString(),
      },
    });
  }

  return instances;
}

/**
 * Create intake assessments for a new patient
 */
export async function createIntakeAssessments(
  patientId: string,
  userId?: string
) {
  const policy = await getDefaultPolicy();

  if (!policy.requireAtIntake) {
    return [];
  }

  return createMeasureInstances({
    patientId,
    dueDate: new Date(),
    userId,
  });
}

/**
 * Schedule next assessments after completion
 */
export async function scheduleNextAssessments(
  patientId: string,
  userId?: string
) {
  const policy = await getDefaultPolicy();

  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + policy.cadenceDays);

  return createMeasureInstances({
    patientId,
    dueDate: nextDueDate,
    userId,
  });
}

/**
 * Get upcoming appointments and create measure instances
 * This is the cron job function mentioned in Step 6
 */
export async function generateUpcomingInstances(daysAhead: number = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Find appointments in the next X days that don't have measure instances
  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledAt: {
        gte: new Date(),
        lte: futureDate,
      },
      isCancelled: false,
      measureInstances: {
        none: {},
      },
    },
    include: {
      patient: true,
    },
  });

  const results = [];

  for (const appointment of appointments) {
    const instances = await createMeasureInstances({
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      dueDate: appointment.scheduledAt,
    });
    results.push({ appointmentId: appointment.id, instances });
  }

  return results;
}

/**
 * Get due and overdue assessments for compliance tracking
 */
export async function getDueAssessments() {
  const policy = await getDefaultPolicy();
  const now = new Date();
  const gracePeriod = new Date();
  gracePeriod.setDate(gracePeriod.getDate() - policy.graceWindowDays);

  // Due assessments (within grace period)
  const due = await prisma.measureInstance.findMany({
    where: {
      status: { in: ["PENDING", "SENT", "STARTED"] },
      dueDate: {
        lte: now,
        gte: gracePeriod,
      },
    },
    include: {
      patient: true,
      measure: true,
    },
    orderBy: { dueDate: "asc" },
  });

  // Overdue assessments (past grace period, not expired)
  const overdue = await prisma.measureInstance.findMany({
    where: {
      status: { in: ["PENDING", "SENT", "STARTED"] },
      dueDate: {
        lt: gracePeriod,
      },
      expiresAt: {
        gt: now,
      },
    },
    include: {
      patient: true,
      measure: true,
    },
    orderBy: { dueDate: "asc" },
  });

  return { due, overdue };
}

/**
 * Mark expired instances
 */
export async function markExpiredInstances() {
  const now = new Date();

  const result = await prisma.measureInstance.updateMany({
    where: {
      status: { in: ["PENDING", "SENT", "STARTED"] },
      expiresAt: { lt: now },
    },
    data: {
      status: "EXPIRED",
    },
  });

  return result.count;
}
