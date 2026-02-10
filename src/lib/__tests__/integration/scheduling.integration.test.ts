/**
 * Integration Tests for Scheduling Service
 * Tests real database interactions for scheduling-related operations
 *
 * Note: These tests directly test the database operations that scheduling
 * functions perform, without importing the actual functions to avoid
 * module mocking complexity.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "./setup";
import {
  createTestClinician,
  createTestPatient,
  createTestAppointment,
  createTestMeasureInstance,
  createTestPolicy,
  getTestMeasures,
  resetCounter,
} from "./db-helpers";

describe("Scheduling Integration Tests", () => {
  beforeEach(() => {
    resetCounter();
  });

  describe("getDefaultPolicy behavior", () => {
    it("creates policy if none exists", async () => {
      // Verify no policy exists
      const existingPolicy = await prisma.mbcPolicy.findUnique({
        where: { name: "default" },
      });
      expect(existingPolicy).toBeNull();

      // Simulate what getDefaultPolicy does
      const policy = await prisma.mbcPolicy.create({
        data: {
          name: "default",
          cadenceDays: 14,
          graceWindowDays: 3,
          expirationDays: 7,
          measuresRequired: ["PHQ-9", "GAD-7"],
          requireAtIntake: true,
        },
      });

      expect(policy).toBeDefined();
      expect(policy.name).toBe("default");
      expect(policy.cadenceDays).toBe(14);
    });

    it("returns existing policy", async () => {
      const customPolicy = await createTestPolicy(prisma, {
        cadenceDays: 7,
        graceWindowDays: 2,
      });

      const policy = await prisma.mbcPolicy.findUnique({
        where: { name: "default" },
      });

      expect(policy?.id).toBe(customPolicy.id);
      expect(policy?.cadenceDays).toBe(7);
    });
  });

  describe("createMeasureInstances behavior", () => {
    it("creates instances for all required measures", async () => {
      await createTestPolicy(prisma);
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      const policy = await prisma.mbcPolicy.findUnique({
        where: { name: "default" },
      });

      const measures = await prisma.measure.findMany({
        where: { name: { in: policy!.measuresRequired } },
      });

      const dueDate = new Date();
      const expiresAt = new Date(dueDate);
      expiresAt.setDate(expiresAt.getDate() + policy!.expirationDays);

      const instances = await Promise.all(
        measures.map((measure) =>
          prisma.measureInstance.create({
            data: {
              patientId: patient.id,
              measureId: measure.id,
              dueDate,
              expiresAt,
              status: "PENDING",
            },
          })
        )
      );

      expect(instances).toHaveLength(2);

      const { phq9, gad7 } = await getTestMeasures(prisma);
      const measureIds = instances.map((i) => i.measureId);
      expect(measureIds).toContain(phq9.id);
      expect(measureIds).toContain(gad7.id);
    });

    it("generates unique tokens for each instance", async () => {
      await createTestPolicy(prisma);
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);
      const { phq9, gad7 } = await getTestMeasures(prisma);

      const dueDate = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create instances (Prisma auto-generates unique tokens via cuid())
      const instance1 = await prisma.measureInstance.create({
        data: { patientId: patient.id, measureId: phq9.id, dueDate, expiresAt, status: "PENDING" },
      });
      const instance2 = await prisma.measureInstance.create({
        data: { patientId: patient.id, measureId: gad7.id, dueDate, expiresAt, status: "PENDING" },
      });

      expect(instance1.token).toBeTruthy();
      expect(instance2.token).toBeTruthy();
      expect(instance1.token).not.toBe(instance2.token);
    });

    it("sets correct due date and expiration", async () => {
      await createTestPolicy(prisma, { expirationDays: 10 });
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);
      const { phq9 } = await getTestMeasures(prisma);

      const dueDate = new Date("2024-06-15T12:00:00Z");
      const expiresAt = new Date(dueDate);
      expiresAt.setDate(expiresAt.getDate() + 10);

      const instance = await prisma.measureInstance.create({
        data: {
          patientId: patient.id,
          measureId: phq9.id,
          dueDate,
          expiresAt,
          status: "PENDING",
        },
      });

      expect(instance.dueDate.toISOString()).toBe(dueDate.toISOString());
      expect(instance.expiresAt.toISOString()).toBe(expiresAt.toISOString());
    });

    it("associates instances with appointment when provided", async () => {
      await createTestPolicy(prisma);
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);
      const appointment = await createTestAppointment(prisma, patient.id, clinician.id);
      const { phq9 } = await getTestMeasures(prisma);

      const instance = await prisma.measureInstance.create({
        data: {
          patientId: patient.id,
          measureId: phq9.id,
          appointmentId: appointment.id,
          dueDate: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "PENDING",
        },
      });

      expect(instance.appointmentId).toBe(appointment.id);
    });

    it("creates audit event for each instance", async () => {
      const { user, clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);
      const { phq9, gad7 } = await getTestMeasures(prisma);

      const dueDate = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const instance1 = await prisma.measureInstance.create({
        data: { patientId: patient.id, measureId: phq9.id, dueDate, expiresAt, status: "PENDING" },
      });
      const instance2 = await prisma.measureInstance.create({
        data: { patientId: patient.id, measureId: gad7.id, dueDate, expiresAt, status: "PENDING" },
      });

      // Log audit events like scheduling.ts does
      for (const instance of [instance1, instance2]) {
        await prisma.auditEvent.create({
          data: {
            eventType: "INSTANCE_CREATED",
            userId: user.id,
            patientId: patient.id,
            resourceType: "MeasureInstance",
            resourceId: instance.id,
            metadata: { measureId: instance.measureId, dueDate: dueDate.toISOString() },
          },
        });
      }

      const auditEvents = await prisma.auditEvent.findMany({
        where: { eventType: "INSTANCE_CREATED" },
      });

      expect(auditEvents).toHaveLength(2);
      auditEvents.forEach((event) => {
        expect(event.userId).toBe(user.id);
        expect(event.patientId).toBe(patient.id);
        expect(event.resourceType).toBe("MeasureInstance");
      });
    });
  });

  describe("generateUpcomingInstances behavior", () => {
    it("finds appointments in window without instances", async () => {
      await createTestPolicy(prisma);
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 3);
      await createTestAppointment(prisma, patient.id, clinician.id, { scheduledAt });

      const daysAhead = 7;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const appointments = await prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: new Date(), lte: futureDate },
          isCancelled: false,
          measureInstances: { none: {} },
        },
        include: { patient: true },
      });

      expect(appointments).toHaveLength(1);
    });

    it("skips appointments with existing instances", async () => {
      await createTestPolicy(prisma);
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);
      const { phq9 } = await getTestMeasures(prisma);

      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 3);
      const appointment = await createTestAppointment(prisma, patient.id, clinician.id, { scheduledAt });

      // Create existing instance
      await prisma.measureInstance.create({
        data: {
          patientId: patient.id,
          measureId: phq9.id,
          appointmentId: appointment.id,
          dueDate: scheduledAt,
          expiresAt: new Date(scheduledAt.getTime() + 7 * 24 * 60 * 60 * 1000),
          status: "PENDING",
        },
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const appointmentsWithoutInstances = await prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: new Date(), lte: futureDate },
          isCancelled: false,
          measureInstances: { none: {} },
        },
      });

      expect(appointmentsWithoutInstances).toHaveLength(0);
    });

    it("skips cancelled appointments", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 3);
      await createTestAppointment(prisma, patient.id, clinician.id, {
        scheduledAt,
        isCancelled: true,
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const appointments = await prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: new Date(), lte: futureDate },
          isCancelled: false,
          measureInstances: { none: {} },
        },
      });

      expect(appointments).toHaveLength(0);
    });
  });

  describe("getDueAssessments behavior", () => {
    it("returns due assessments within grace period", async () => {
      await createTestPolicy(prisma, { graceWindowDays: 3 });
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 2); // 2 days ago

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);

      await createTestMeasureInstance(prisma, patient.id, {
        dueDate,
        expiresAt,
        status: "PENDING",
      });

      const policy = await prisma.mbcPolicy.findUnique({ where: { name: "default" } });
      const gracePeriod = new Date();
      gracePeriod.setDate(gracePeriod.getDate() - policy!.graceWindowDays);

      const due = await prisma.measureInstance.findMany({
        where: {
          status: { in: ["PENDING", "SENT", "STARTED"] },
          dueDate: { lte: new Date(), gte: gracePeriod },
        },
      });

      expect(due).toHaveLength(1);
    });

    it("returns overdue assessments past grace period", async () => {
      await createTestPolicy(prisma, { graceWindowDays: 3 });
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 5); // 5 days ago

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2);

      await createTestMeasureInstance(prisma, patient.id, {
        dueDate,
        expiresAt,
        status: "PENDING",
      });

      const policy = await prisma.mbcPolicy.findUnique({ where: { name: "default" } });
      const gracePeriod = new Date();
      gracePeriod.setDate(gracePeriod.getDate() - policy!.graceWindowDays);

      const overdue = await prisma.measureInstance.findMany({
        where: {
          status: { in: ["PENDING", "SENT", "STARTED"] },
          dueDate: { lt: gracePeriod },
          expiresAt: { gt: new Date() },
        },
      });

      expect(overdue).toHaveLength(1);
    });

    it("excludes completed assessments", async () => {
      await createTestPolicy(prisma, { graceWindowDays: 3 });
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 1);

      await createTestMeasureInstance(prisma, patient.id, {
        dueDate,
        status: "COMPLETED",
      });

      const due = await prisma.measureInstance.findMany({
        where: {
          status: { in: ["PENDING", "SENT", "STARTED"] },
          dueDate: { lte: new Date() },
        },
      });

      expect(due).toHaveLength(0);
    });
  });

  describe("markExpiredInstances behavior", () => {
    it("updates expired instances to EXPIRED status", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1);

      const instance = await createTestMeasureInstance(prisma, patient.id, {
        expiresAt,
        status: "PENDING",
      });

      const result = await prisma.measureInstance.updateMany({
        where: {
          status: { in: ["PENDING", "SENT", "STARTED"] },
          expiresAt: { lt: new Date() },
        },
        data: { status: "EXPIRED" },
      });

      expect(result.count).toBe(1);

      const updated = await prisma.measureInstance.findUnique({
        where: { id: instance.id },
      });
      expect(updated?.status).toBe("EXPIRED");
    });

    it("does not update non-expired instances", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      const instance = await createTestMeasureInstance(prisma, patient.id, {
        expiresAt,
        status: "PENDING",
      });

      const result = await prisma.measureInstance.updateMany({
        where: {
          status: { in: ["PENDING", "SENT", "STARTED"] },
          expiresAt: { lt: new Date() },
        },
        data: { status: "EXPIRED" },
      });

      expect(result.count).toBe(0);

      const updated = await prisma.measureInstance.findUnique({
        where: { id: instance.id },
      });
      expect(updated?.status).toBe("PENDING");
    });

    it("only updates active status instances", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1);

      await createTestMeasureInstance(prisma, patient.id, {
        expiresAt,
        status: "PENDING",
      });
      await createTestMeasureInstance(prisma, patient.id, {
        expiresAt,
        status: "SENT",
        measureName: "GAD-7",
      });
      await createTestMeasureInstance(prisma, patient.id, {
        expiresAt,
        status: "COMPLETED",
      });

      const result = await prisma.measureInstance.updateMany({
        where: {
          status: { in: ["PENDING", "SENT", "STARTED"] },
          expiresAt: { lt: new Date() },
        },
        data: { status: "EXPIRED" },
      });

      expect(result.count).toBe(2); // Only PENDING and SENT
    });
  });
});
