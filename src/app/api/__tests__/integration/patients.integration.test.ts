/**
 * Integration Tests for Patients API
 * Tests database interactions for patient-related operations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/__tests__/integration/setup";
import {
  createTestClinician,
  createTestPatient,
  createTestPolicy,
  createTestCompletedMeasure,
  createTestAppointment,
  createTestMeasureInstance,
  resetCounter,
} from "@/lib/__tests__/integration/db-helpers";

describe("Patients Integration Tests", () => {
  beforeEach(() => {
    resetCounter();
  });

  describe("Patient CRUD operations", () => {
    it("creates patient in database", async () => {
      const { clinician } = await createTestClinician(prisma);

      const patient = await prisma.patient.create({
        data: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@test.example",
          clinicianId: clinician.id,
        },
      });

      expect(patient.id).toBeDefined();
      expect(patient.firstName).toBe("John");
      expect(patient.lastName).toBe("Doe");
      expect(patient.email).toBe("john.doe@test.example");
      expect(patient.clinicianId).toBe(clinician.id);
    });

    it("retrieves patients for a clinician", async () => {
      const { clinician: clinician1 } = await createTestClinician(prisma);
      const { clinician: clinician2 } = await createTestClinician(prisma);

      await createTestPatient(prisma, clinician1.id, { firstName: "Patient1" });
      await createTestPatient(prisma, clinician2.id, { firstName: "Patient2" });
      await createTestPatient(prisma, clinician2.id, { firstName: "Patient3" });

      const clinician2Patients = await prisma.patient.findMany({
        where: { clinicianId: clinician2.id },
      });

      expect(clinician2Patients).toHaveLength(2);
      expect(clinician2Patients.every((p) => p.clinicianId === clinician2.id)).toBe(true);
    });

    it("searches patients by name", async () => {
      const { clinician } = await createTestClinician(prisma);

      await createTestPatient(prisma, clinician.id, { firstName: "John", lastName: "Doe" });
      await createTestPatient(prisma, clinician.id, { firstName: "Jane", lastName: "Smith" });
      await createTestPatient(prisma, clinician.id, { firstName: "Bob", lastName: "Johnson" });

      const searchResults = await prisma.patient.findMany({
        where: {
          OR: [
            { firstName: { contains: "john", mode: "insensitive" } },
            { lastName: { contains: "john", mode: "insensitive" } },
          ],
        },
      });

      expect(searchResults).toHaveLength(2); // John Doe and Bob Johnson
    });

    it("filters active patients", async () => {
      const { clinician } = await createTestClinician(prisma);

      await createTestPatient(prisma, clinician.id, { isActive: true });
      await createTestPatient(prisma, clinician.id, { isActive: false });

      const activePatients = await prisma.patient.findMany({
        where: { isActive: true },
      });

      expect(activePatients).toHaveLength(1);
    });
  });

  describe("Patient with audit events", () => {
    it("logs audit event when patient is created", async () => {
      const { user, clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await prisma.auditEvent.create({
        data: {
          eventType: "PATIENT_CREATED",
          userId: user.id,
          patientId: patient.id,
          resourceType: "Patient",
          resourceId: patient.id,
          metadata: { clinicianId: clinician.id },
        },
      });

      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          eventType: "PATIENT_CREATED",
          patientId: patient.id,
        },
      });

      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0].userId).toBe(user.id);
    });
  });

  describe("Patient intake assessments", () => {
    it("creates intake assessments for new patient", async () => {
      await createTestPolicy(prisma, { requireAtIntake: true });
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      const phq9 = await prisma.measure.findUnique({ where: { name: "PHQ-9" } });
      const gad7 = await prisma.measure.findUnique({ where: { name: "GAD-7" } });

      const dueDate = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create intake instances
      await prisma.measureInstance.createMany({
        data: [
          {
            patientId: patient.id,
            measureId: phq9!.id,
            status: "PENDING",
            dueDate,
            expiresAt,
          },
          {
            patientId: patient.id,
            measureId: gad7!.id,
            status: "PENDING",
            dueDate,
            expiresAt,
          },
        ],
      });

      const instances = await prisma.measureInstance.findMany({
        where: { patientId: patient.id },
      });

      expect(instances).toHaveLength(2);
    });
  });

  describe("Patient progress data", () => {
    it("retrieves completed measure instances with scores", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await createTestCompletedMeasure(prisma, patient.id, {
        measureName: "PHQ-9",
      }, {
        totalScore: 10,
        severityBand: "moderate",
      });

      await createTestCompletedMeasure(prisma, patient.id, {
        measureName: "GAD-7",
      }, {
        totalScore: 8,
        severityBand: "mild",
      });

      const responses = await prisma.measureResponse.findMany({
        where: {
          measureInstance: {
            patientId: patient.id,
            status: "COMPLETED",
          },
        },
        include: {
          measureInstance: {
            include: {
              measure: true,
            },
          },
        },
      });

      expect(responses).toHaveLength(2);

      const phq9Response = responses.find((r) => r.measureInstance.measure.name === "PHQ-9");
      expect(phq9Response?.totalScore).toBe(10);
      expect(phq9Response?.severityBand).toBe("moderate");

      const gad7Response = responses.find((r) => r.measureInstance.measure.name === "GAD-7");
      expect(gad7Response?.totalScore).toBe(8);
      expect(gad7Response?.severityBand).toBe("mild");
    });

    it("retrieves appointment history", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      await createTestAppointment(prisma, patient.id, clinician.id, {
        scheduledAt: pastDate,
        completedAt: pastDate,
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      await createTestAppointment(prisma, patient.id, clinician.id, {
        scheduledAt: futureDate,
      });

      const appointments = await prisma.appointment.findMany({
        where: { patientId: patient.id },
        orderBy: { scheduledAt: "asc" },
      });

      expect(appointments).toHaveLength(2);
      expect(appointments[0].completedAt).not.toBeNull();
      expect(appointments[1].completedAt).toBeNull();
    });

    it("retrieves pending assessments", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await createTestMeasureInstance(prisma, patient.id, {
        measureName: "PHQ-9",
        status: "PENDING",
      });

      await createTestMeasureInstance(prisma, patient.id, {
        measureName: "GAD-7",
        status: "SENT",
      });

      const pendingInstances = await prisma.measureInstance.findMany({
        where: {
          patientId: patient.id,
          status: { in: ["PENDING", "SENT", "STARTED"] },
        },
        include: { measure: true },
      });

      expect(pendingInstances).toHaveLength(2);
    });

    it("calculates assessment counts", async () => {
      const { clinician } = await createTestClinician(prisma);
      const patient = await createTestPatient(prisma, clinician.id);

      await createTestCompletedMeasure(prisma, patient.id);
      await createTestMeasureInstance(prisma, patient.id, { measureName: "GAD-7" });
      await createTestAppointment(prisma, patient.id, clinician.id);

      const patientWithCounts = await prisma.patient.findUnique({
        where: { id: patient.id },
        include: {
          _count: {
            select: {
              measureInstances: true,
              appointments: true,
            },
          },
        },
      });

      expect(patientWithCounts?._count.measureInstances).toBe(2);
      expect(patientWithCounts?._count.appointments).toBe(1);
    });

    it("retrieves patient with clinician info", async () => {
      const { clinician, user } = await createTestClinician(prisma, {
        firstName: "Dr",
        lastName: "Smith",
      });
      const patient = await createTestPatient(prisma, clinician.id);

      const patientWithClinician = await prisma.patient.findUnique({
        where: { id: patient.id },
        include: {
          clinician: {
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      });

      expect(patientWithClinician?.clinician.user.firstName).toBe("Dr");
      expect(patientWithClinician?.clinician.user.lastName).toBe("Smith");
    });
  });
});
