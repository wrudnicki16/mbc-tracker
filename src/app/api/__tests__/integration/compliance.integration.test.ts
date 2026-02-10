/**
 * Integration Tests for Compliance API
 * Tests database interactions for compliance-related operations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/__tests__/integration/setup";
import {
  createTestClinician,
  createTestPatient,
  createTestMeasureInstance,
  createTestCompletedMeasure,
  createTestPolicy,
  createTestAuditEvent,
  resetCounter,
} from "@/lib/__tests__/integration/db-helpers";

describe("Compliance Integration Tests", () => {
  beforeEach(() => {
    resetCounter();
  });

  describe("Compliance metrics", () => {
    it("counts completed instances", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await createTestCompletedMeasure(prisma, patient.id);
      await createTestCompletedMeasure(prisma, patient.id, { measureName: "GAD-7" });

      const days = 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const totalCompleted = await prisma.measureInstance.count({
        where: {
          status: "COMPLETED",
          completedAt: { gte: startDate },
        },
      });

      expect(totalCompleted).toBe(2);
    });

    it("counts overdue instances", async () => {
      await createTestPolicy(prisma, { graceWindowDays: 3 });
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      // Create overdue instance (past due, not completed, not expired)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 5);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2);

      await createTestMeasureInstance(prisma, patient.id, {
        dueDate,
        expiresAt,
        status: "PENDING",
      });

      const totalOverdue = await prisma.measureInstance.count({
        where: {
          status: { in: ["PENDING", "SENT", "STARTED"] },
          dueDate: { lt: new Date() },
          expiresAt: { gt: new Date() },
        },
      });

      expect(totalOverdue).toBe(1);
    });

    it("calculates compliance rate", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      // Create 3 completed, 1 pending
      await createTestCompletedMeasure(prisma, patient.id);
      await createTestCompletedMeasure(prisma, patient.id, { measureName: "GAD-7" });
      await createTestCompletedMeasure(prisma, patient.id);
      await createTestMeasureInstance(prisma, patient.id, { measureName: "GAD-7" });

      const days = 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [totalDue, totalCompleted] = await Promise.all([
        prisma.measureInstance.count({
          where: {
            dueDate: { gte: startDate },
          },
        }),
        prisma.measureInstance.count({
          where: {
            status: "COMPLETED",
            completedAt: { gte: startDate },
          },
        }),
      ]);

      const complianceRate = totalDue > 0 ? (totalCompleted / totalDue) * 100 : 100;

      expect(totalDue).toBe(4);
      expect(totalCompleted).toBe(3);
      expect(complianceRate).toBe(75);
    });

    it("filters compliance by clinician", async () => {
      const { clinician: clinician1 } = await createTestClinician(prisma);
      const { clinician: clinician2 } = await createTestClinician(prisma);

      const patient1 = await createTestPatient(prisma, clinician1.id);
      const patient2 = await createTestPatient(prisma, clinician2.id);

      await createTestCompletedMeasure(prisma, patient1.id);
      await createTestCompletedMeasure(prisma, patient1.id, { measureName: "GAD-7" });
      await createTestMeasureInstance(prisma, patient2.id);

      const clinician1Completed = await prisma.measureInstance.count({
        where: {
          patient: { clinicianId: clinician1.id },
          status: "COMPLETED",
        },
      });

      expect(clinician1Completed).toBe(2);
    });

    it("includes overdue details", async () => {
      await createTestPolicy(prisma, { graceWindowDays: 3 });
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id, {
        firstName: "Overdue",
        lastName: "Patient",
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 5);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2);

      await createTestMeasureInstance(prisma, patient.id, {
        dueDate,
        expiresAt,
        status: "PENDING",
        measureName: "PHQ-9",
      });

      const overdueInstances = await prisma.measureInstance.findMany({
        where: {
          status: { in: ["PENDING", "SENT", "STARTED"] },
          dueDate: { lt: new Date() },
          expiresAt: { gt: new Date() },
        },
        include: {
          patient: true,
          measure: true,
        },
      });

      expect(overdueInstances).toHaveLength(1);
      expect(overdueInstances[0].patient.firstName).toBe("Overdue");
      expect(overdueInstances[0].measure.name).toBe("PHQ-9");

      const daysPastDue = Math.floor(
        (new Date().getTime() - overdueInstances[0].dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysPastDue).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Audit trail", () => {
    it("retrieves audit trail for patient", async () => {
      const { user, clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await createTestAuditEvent(prisma, "PATIENT_CREATED", {
        userId: user.id,
        patientId: patient.id,
      });
      await createTestAuditEvent(prisma, "INSTANCE_CREATED", {
        patientId: patient.id,
      });

      const patientEvents = await prisma.auditEvent.findMany({
        where: { patientId: patient.id },
      });

      expect(patientEvents).toHaveLength(2);
      expect(patientEvents.every((e) => e.patientId === patient.id)).toBe(true);
    });

    it("filters audit events by type", async () => {
      const { user, clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await createTestAuditEvent(prisma, "PATIENT_CREATED", { patientId: patient.id });
      await createTestAuditEvent(prisma, "INSTANCE_CREATED", { patientId: patient.id });
      await createTestAuditEvent(prisma, "USER_LOGIN", { userId: user.id });

      const patientCreatedEvents = await prisma.auditEvent.findMany({
        where: { eventType: "PATIENT_CREATED" },
      });

      expect(patientCreatedEvents).toHaveLength(1);
    });

    it("filters audit events by date range", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await createTestAuditEvent(prisma, "PATIENT_CREATED", { patientId: patient.id });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const eventsInRange = await prisma.auditEvent.findMany({
        where: {
          createdAt: {
            gte: yesterday,
            lte: tomorrow,
          },
        },
      });

      expect(eventsInRange.length).toBeGreaterThanOrEqual(1);
    });

    it("limits audit event results", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      for (let i = 0; i < 5; i++) {
        await createTestAuditEvent(prisma, "INSTANCE_CREATED", { patientId: patient.id });
      }

      const limitedEvents = await prisma.auditEvent.findMany({
        take: 3,
      });

      expect(limitedEvents).toHaveLength(3);
    });

    it("includes user info in audit events", async () => {
      const { user, clinician } = await createTestClinician(prisma, {
        firstName: "Test",
        lastName: "Clinician",
        email: "test.clinician@example.com",
      });

      await createTestAuditEvent(prisma, "USER_LOGIN", { userId: user.id });

      const eventsWithUser = await prisma.auditEvent.findMany({
        where: { eventType: "USER_LOGIN" },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      expect(eventsWithUser).toHaveLength(1);
      expect(eventsWithUser[0].user?.email).toBe("test.clinician@example.com");
      expect(eventsWithUser[0].user?.firstName).toBe("Test");
      expect(eventsWithUser[0].user?.lastName).toBe("Clinician");
    });

    it("orders events by createdAt descending", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await createTestAuditEvent(prisma, "INSTANCE_CREATED", {
        patientId: patient.id,
        metadata: { order: 1 },
      });
      await new Promise((r) => setTimeout(r, 10));
      await createTestAuditEvent(prisma, "INSTANCE_CREATED", {
        patientId: patient.id,
        metadata: { order: 2 },
      });
      await new Promise((r) => setTimeout(r, 10));
      await createTestAuditEvent(prisma, "INSTANCE_CREATED", {
        patientId: patient.id,
        metadata: { order: 3 },
      });

      const orderedEvents = await prisma.auditEvent.findMany({
        where: { eventType: "INSTANCE_CREATED" },
        orderBy: { createdAt: "desc" },
      });

      expect(orderedEvents).toHaveLength(3);
      expect((orderedEvents[0].metadata as { order: number }).order).toBe(3);
      expect((orderedEvents[2].metadata as { order: number }).order).toBe(1);
    });
  });
});
