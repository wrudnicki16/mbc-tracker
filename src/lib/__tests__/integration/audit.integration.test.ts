/**
 * Integration Tests for Audit Logging Service
 * Tests real database interactions for audit-related operations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "./setup";
import {
  createTestClinician,
  createTestPatient,
  createTestAuditEvent,
  resetCounter,
} from "./db-helpers";

describe("Audit Integration Tests", () => {
  beforeEach(() => {
    resetCounter();
  });

  describe("logAuditEvent behavior", () => {
    it("creates audit record with all fields", async () => {
      const { user, clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await prisma.auditEvent.create({
        data: {
          eventType: "PATIENT_CREATED",
          userId: user.id,
          patientId: patient.id,
          resourceType: "Patient",
          resourceId: patient.id,
          metadata: { source: "api", version: "1.0" },
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0 Test Browser",
        },
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "PATIENT_CREATED" },
      });

      expect(events).toHaveLength(1);
      expect(events[0].userId).toBe(user.id);
      expect(events[0].patientId).toBe(patient.id);
      expect(events[0].resourceType).toBe("Patient");
      expect(events[0].resourceId).toBe(patient.id);
      expect(events[0].metadata).toEqual({ source: "api", version: "1.0" });
      expect(events[0].ipAddress).toBe("192.168.1.1");
      expect(events[0].userAgent).toBe("Mozilla/5.0 Test Browser");
    });

    it("creates audit record with minimal fields", async () => {
      await prisma.auditEvent.create({
        data: {
          eventType: "USER_LOGIN",
        },
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "USER_LOGIN" },
      });

      expect(events).toHaveLength(1);
      expect(events[0].userId).toBeNull();
      expect(events[0].patientId).toBeNull();
      expect(events[0].resourceType).toBeNull();
      expect(events[0].metadata).toBeNull();
    });

    it("sets createdAt timestamp automatically", async () => {
      const before = new Date();
      await prisma.auditEvent.create({
        data: { eventType: "USER_LOGIN" },
      });
      const after = new Date();

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "USER_LOGIN" },
      });

      expect(events[0].createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(events[0].createdAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it("generates unique IDs for each event", async () => {
      await prisma.auditEvent.create({ data: { eventType: "USER_LOGIN" } });
      await prisma.auditEvent.create({ data: { eventType: "USER_LOGIN" } });
      await prisma.auditEvent.create({ data: { eventType: "USER_LOGIN" } });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "USER_LOGIN" },
      });

      const ids = events.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe("userLogin event", () => {
    it("logs login with IP and user-agent", async () => {
      const { user } = await createTestClinician(prisma);

      await prisma.auditEvent.create({
        data: {
          eventType: "USER_LOGIN",
          userId: user.id,
          ipAddress: "10.0.0.1",
          userAgent: "Chrome/120.0",
        },
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "USER_LOGIN" },
      });

      expect(events).toHaveLength(1);
      expect(events[0].userId).toBe(user.id);
      expect(events[0].ipAddress).toBe("10.0.0.1");
      expect(events[0].userAgent).toBe("Chrome/120.0");
    });
  });

  describe("Event type coverage", () => {
    it("INSTANCE_CREATED logs correctly", async () => {
      await createTestAuditEvent(prisma, "INSTANCE_CREATED", {
        resourceType: "MeasureInstance",
        resourceId: "inst-1",
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "INSTANCE_CREATED" },
      });
      expect(events).toHaveLength(1);
      expect(events[0].resourceType).toBe("MeasureInstance");
    });

    it("LINK_GENERATED logs correctly", async () => {
      await createTestAuditEvent(prisma, "LINK_GENERATED", {
        resourceType: "MeasureInstance",
        resourceId: "inst-1",
        metadata: { token: "abc123" },
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "LINK_GENERATED" },
      });
      expect(events).toHaveLength(1);
    });

    it("LINK_SENT logs correctly", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await createTestAuditEvent(prisma, "LINK_SENT", {
        patientId: patient.id,
        resourceType: "MeasureInstance",
        metadata: { channel: "email" },
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "LINK_SENT" },
      });
      expect(events).toHaveLength(1);
      expect(events[0].patientId).toBe(patient.id);
    });

    it("QUESTIONNAIRE_STARTED logs correctly", async () => {
      await createTestAuditEvent(prisma, "QUESTIONNAIRE_STARTED", {
        resourceType: "MeasureInstance",
        resourceId: "inst-1",
        ipAddress: "1.2.3.4",
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "QUESTIONNAIRE_STARTED" },
      });
      expect(events).toHaveLength(1);
    });

    it("QUESTIONNAIRE_SUBMITTED logs correctly", async () => {
      await createTestAuditEvent(prisma, "QUESTIONNAIRE_SUBMITTED", {
        resourceType: "MeasureInstance",
        resourceId: "inst-1",
        metadata: { totalScore: 10 },
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "QUESTIONNAIRE_SUBMITTED" },
      });
      expect(events).toHaveLength(1);
    });

    it("SCORE_COMPUTED logs correctly", async () => {
      await createTestAuditEvent(prisma, "SCORE_COMPUTED", {
        resourceType: "MeasureResponse",
        resourceId: "resp-1",
        metadata: { score: 12, band: "moderate" },
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "SCORE_COMPUTED" },
      });
      expect(events).toHaveLength(1);
    });

    it("CLINICIAN_VIEWED_CHART logs correctly", async () => {
      const { user, clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await createTestAuditEvent(prisma, "CLINICIAN_VIEWED_CHART", {
        userId: user.id,
        patientId: patient.id,
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "CLINICIAN_VIEWED_CHART" },
      });
      expect(events).toHaveLength(1);
      expect(events[0].userId).toBe(user.id);
      expect(events[0].patientId).toBe(patient.id);
    });

    it("PATIENT_CREATED logs correctly", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await createTestAuditEvent(prisma, "PATIENT_CREATED", {
        patientId: patient.id,
        resourceType: "Patient",
        resourceId: patient.id,
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "PATIENT_CREATED" },
      });
      expect(events).toHaveLength(1);
    });

    it("PATIENT_UPDATED logs correctly", async () => {
      const { user, clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await createTestAuditEvent(prisma, "PATIENT_UPDATED", {
        userId: user.id,
        patientId: patient.id,
        metadata: { changedFields: ["email", "phone"] },
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "PATIENT_UPDATED" },
      });
      expect(events).toHaveLength(1);
    });

    it("APPOINTMENT_CREATED logs correctly", async () => {
      await createTestAuditEvent(prisma, "APPOINTMENT_CREATED", {
        resourceType: "Appointment",
        resourceId: "appt-1",
        metadata: { scheduledAt: new Date().toISOString() },
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "APPOINTMENT_CREATED" },
      });
      expect(events).toHaveLength(1);
    });

    it("APPOINTMENT_CANCELLED logs correctly", async () => {
      await createTestAuditEvent(prisma, "APPOINTMENT_CANCELLED", {
        resourceType: "Appointment",
        resourceId: "appt-1",
        metadata: { reason: "Patient request" },
      });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "APPOINTMENT_CANCELLED" },
      });
      expect(events).toHaveLength(1);
    });
  });

  describe("Query patterns", () => {
    it("can filter events by patient ID", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient1 = await createTestPatient(prisma, clinician.id);
      const patient2 = await createTestPatient(prisma, clinician.id);

      await createTestAuditEvent(prisma, "PATIENT_CREATED", { patientId: patient1.id });
      await createTestAuditEvent(prisma, "PATIENT_CREATED", { patientId: patient2.id });
      await createTestAuditEvent(prisma, "PATIENT_UPDATED", { patientId: patient1.id });

      const patient1Events = await prisma.auditEvent.findMany({
        where: { patientId: patient1.id },
      });

      expect(patient1Events).toHaveLength(2);
    });

    it("can filter events by event type", async () => {
      await createTestAuditEvent(prisma, "USER_LOGIN", {});
      await createTestAuditEvent(prisma, "USER_LOGIN", {});
      await createTestAuditEvent(prisma, "PATIENT_CREATED", {});

      const loginEvents = await prisma.auditEvent.findMany({
        where: { eventType: "USER_LOGIN" },
      });

      expect(loginEvents).toHaveLength(2);
    });

    it("can filter events by date range", async () => {
      await createTestAuditEvent(prisma, "USER_LOGIN", {});

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const todayEvents = await prisma.auditEvent.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      expect(todayEvents.length).toBeGreaterThanOrEqual(1);
    });

    it("events are ordered by createdAt descending", async () => {
      await createTestAuditEvent(prisma, "USER_LOGIN", { metadata: { order: 1 } });
      await new Promise((r) => setTimeout(r, 10));
      await createTestAuditEvent(prisma, "USER_LOGIN", { metadata: { order: 2 } });
      await new Promise((r) => setTimeout(r, 10));
      await createTestAuditEvent(prisma, "USER_LOGIN", { metadata: { order: 3 } });

      const events = await prisma.auditEvent.findMany({
        where: { eventType: "USER_LOGIN" },
        orderBy: { createdAt: "desc" },
      });

      expect(events).toHaveLength(3);
      expect((events[0].metadata as { order: number }).order).toBe(3);
      expect((events[2].metadata as { order: number }).order).toBe(1);
    });
  });
});
