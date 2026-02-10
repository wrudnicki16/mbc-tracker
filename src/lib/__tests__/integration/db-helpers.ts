/**
 * Database Test Helpers
 * Factory functions for creating test data
 */

import { PrismaClient, UserRole, MeasureInstanceStatus } from "@prisma/client";
import { hash } from "bcryptjs";

interface TestUserOverrides {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  passwordHash?: string;
}

interface TestPatientOverrides {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  isActive?: boolean;
  intakeDate?: Date;
}

interface TestAppointmentOverrides {
  scheduledAt?: Date;
  completedAt?: Date | null;
  isCancelled?: boolean;
}

interface TestMeasureInstanceOverrides {
  measureName?: "PHQ-9" | "GAD-7";
  appointmentId?: string | null;
  status?: MeasureInstanceStatus;
  dueDate?: Date;
  expiresAt?: Date;
  sentAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

interface TestMeasureResponseOverrides {
  totalScore?: number;
  severityBand?: string;
  answers?: Array<{ questionNum: number; value: number }>;
  completedAt?: Date;
}

// Counter for generating unique values
let counter = 0;

function getCounter(): number {
  return ++counter;
}

export function resetCounter(): void {
  counter = 0;
}

/**
 * Create a test user
 */
export async function createTestUser(
  prisma: PrismaClient,
  overrides: TestUserOverrides = {}
): Promise<ReturnType<typeof prisma.user.create>> {
  const count = getCounter();
  const defaultPassword = await hash("testpass123", 4); // Lower rounds for test speed

  return prisma.user.create({
    data: {
      email: overrides.email ?? `testuser${count}@test.example`,
      firstName: overrides.firstName ?? `Test`,
      lastName: overrides.lastName ?? `User${count}`,
      role: overrides.role ?? UserRole.CLINICIAN,
      passwordHash: overrides.passwordHash ?? defaultPassword,
    },
  });
}

/**
 * Create a test user with clinician profile
 */
export async function createTestClinician(
  prisma: PrismaClient,
  userOverrides: TestUserOverrides = {}
): Promise<{
  user: Awaited<ReturnType<typeof prisma.user.create>>;
  clinician: Awaited<ReturnType<typeof prisma.clinician.create>>;
}> {
  const user = await createTestUser(prisma, {
    ...userOverrides,
    role: UserRole.CLINICIAN,
  });

  const clinician = await prisma.clinician.create({
    data: {
      userId: user.id,
    },
  });

  return { user, clinician };
}

/**
 * Create a test admin user
 */
export async function createTestAdmin(
  prisma: PrismaClient,
  overrides: TestUserOverrides = {}
): Promise<ReturnType<typeof prisma.user.create>> {
  return createTestUser(prisma, {
    ...overrides,
    role: UserRole.ADMIN,
  });
}

/**
 * Create a test patient
 */
export async function createTestPatient(
  prisma: PrismaClient,
  clinicianId: string,
  overrides: TestPatientOverrides = {}
): Promise<ReturnType<typeof prisma.patient.create>> {
  const count = getCounter();

  return prisma.patient.create({
    data: {
      firstName: overrides.firstName ?? `Patient`,
      lastName: overrides.lastName ?? `Test${count}`,
      email: overrides.email ?? `patient${count}@test.example`,
      phone: overrides.phone ?? null,
      externalId: overrides.externalId ?? `TEST-MRN-${count}`,
      clinicianId,
      isActive: overrides.isActive ?? true,
      intakeDate: overrides.intakeDate ?? new Date(),
    },
  });
}

/**
 * Create a test appointment
 */
export async function createTestAppointment(
  prisma: PrismaClient,
  patientId: string,
  clinicianId: string,
  overrides: TestAppointmentOverrides = {}
): Promise<ReturnType<typeof prisma.appointment.create>> {
  const defaultScheduledAt = new Date();
  defaultScheduledAt.setDate(defaultScheduledAt.getDate() + 7); // Default: 7 days from now

  return prisma.appointment.create({
    data: {
      patientId,
      clinicianId,
      scheduledAt: overrides.scheduledAt ?? defaultScheduledAt,
      completedAt: overrides.completedAt ?? null,
      isCancelled: overrides.isCancelled ?? false,
    },
  });
}

/**
 * Create a test measure instance
 */
export async function createTestMeasureInstance(
  prisma: PrismaClient,
  patientId: string,
  overrides: TestMeasureInstanceOverrides = {}
): Promise<ReturnType<typeof prisma.measureInstance.create>> {
  const measureName = overrides.measureName ?? "PHQ-9";
  const measure = await prisma.measure.findUnique({
    where: { name: measureName },
  });

  if (!measure) {
    throw new Error(`Measure ${measureName} not found. Run seed first.`);
  }

  const dueDate = overrides.dueDate ?? new Date();
  const expiresAt = overrides.expiresAt ?? new Date(dueDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  return prisma.measureInstance.create({
    data: {
      patientId,
      measureId: measure.id,
      appointmentId: overrides.appointmentId ?? null,
      status: overrides.status ?? "PENDING",
      dueDate,
      expiresAt,
      sentAt: overrides.sentAt ?? null,
      startedAt: overrides.startedAt ?? null,
      completedAt: overrides.completedAt ?? null,
    },
  });
}

/**
 * Create a completed measure instance with response
 */
export async function createTestCompletedMeasure(
  prisma: PrismaClient,
  patientId: string,
  instanceOverrides: TestMeasureInstanceOverrides = {},
  responseOverrides: TestMeasureResponseOverrides = {}
): Promise<{
  instance: Awaited<ReturnType<typeof prisma.measureInstance.create>>;
  response: Awaited<ReturnType<typeof prisma.measureResponse.create>>;
}> {
  const completedAt = responseOverrides.completedAt ?? new Date();

  const instance = await createTestMeasureInstance(prisma, patientId, {
    ...instanceOverrides,
    status: "COMPLETED",
    completedAt,
  });

  const measureName = instanceOverrides.measureName ?? "PHQ-9";
  const numQuestions = measureName === "PHQ-9" ? 9 : 7;

  const defaultAnswers = Array.from({ length: numQuestions }, (_, i) => ({
    questionNum: i + 1,
    value: 1,
  }));

  const answers = responseOverrides.answers ?? defaultAnswers;
  const totalScore = responseOverrides.totalScore ?? answers.reduce((sum, a) => sum + a.value, 0);

  let severityBand = responseOverrides.severityBand;
  if (!severityBand) {
    if (totalScore <= 4) severityBand = "minimal";
    else if (totalScore <= 9) severityBand = "mild";
    else if (totalScore <= 14) severityBand = "moderate";
    else if (totalScore <= 19 && measureName === "PHQ-9") severityBand = "moderately_severe";
    else severityBand = "severe";
  }

  const response = await prisma.measureResponse.create({
    data: {
      measureInstanceId: instance.id,
      answers,
      totalScore,
      severityBand,
      completedAt,
    },
  });

  return { instance, response };
}

/**
 * Create the default MBC policy
 */
export async function createTestPolicy(
  prisma: PrismaClient,
  overrides: {
    name?: string;
    cadenceDays?: number;
    graceWindowDays?: number;
    expirationDays?: number;
    measuresRequired?: string[];
    requireAtIntake?: boolean;
  } = {}
): Promise<ReturnType<typeof prisma.mbcPolicy.create>> {
  return prisma.mbcPolicy.upsert({
    where: { name: overrides.name ?? "default" },
    update: {},
    create: {
      name: overrides.name ?? "default",
      cadenceDays: overrides.cadenceDays ?? 14,
      graceWindowDays: overrides.graceWindowDays ?? 3,
      expirationDays: overrides.expirationDays ?? 7,
      measuresRequired: overrides.measuresRequired ?? ["PHQ-9", "GAD-7"],
      requireAtIntake: overrides.requireAtIntake ?? true,
    },
  });
}

/**
 * Create a test audit event
 */
export async function createTestAuditEvent(
  prisma: PrismaClient,
  eventType: Parameters<typeof prisma.auditEvent.create>[0]["data"]["eventType"],
  overrides: {
    userId?: string;
    patientId?: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<ReturnType<typeof prisma.auditEvent.create>> {
  return prisma.auditEvent.create({
    data: {
      eventType,
      userId: overrides.userId ?? null,
      patientId: overrides.patientId ?? null,
      resourceType: overrides.resourceType ?? null,
      resourceId: overrides.resourceId ?? null,
      metadata: overrides.metadata ?? null,
      ipAddress: overrides.ipAddress ?? null,
      userAgent: overrides.userAgent ?? null,
    },
  });
}

/**
 * Get measures for test assertions
 */
export async function getTestMeasures(prisma: PrismaClient) {
  const phq9 = await prisma.measure.findUnique({ where: { name: "PHQ-9" } });
  const gad7 = await prisma.measure.findUnique({ where: { name: "GAD-7" } });

  if (!phq9 || !gad7) {
    throw new Error("Measures not seeded. Check setup.");
  }

  return { phq9, gad7 };
}
