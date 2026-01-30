/**
 * Audit Logging Service (Step 11)
 * Records all key actions for compliance traceability.
 */

import { prisma } from "./db";
import { AuditEventType, Prisma } from "@prisma/client";

interface AuditContext {
  userId?: string;
  patientId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(
  eventType: AuditEventType,
  context: AuditContext
) {
  try {
    await prisma.auditEvent.create({
      data: {
        eventType,
        userId: context.userId,
        patientId: context.patientId,
        resourceType: context.resourceType,
        resourceId: context.resourceId,
        metadata: context.metadata,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });
  } catch (error) {
    // Log to console but don't fail the main operation
    console.error("Failed to log audit event:", error);
  }
}

// Convenience functions for common events
export const audit = {
  instanceCreated: (context: AuditContext) =>
    logAuditEvent("INSTANCE_CREATED", context),

  linkGenerated: (context: AuditContext) =>
    logAuditEvent("LINK_GENERATED", context),

  linkSent: (context: AuditContext) =>
    logAuditEvent("LINK_SENT", context),

  questionnaireStarted: (context: AuditContext) =>
    logAuditEvent("QUESTIONNAIRE_STARTED", context),

  questionnaireSubmitted: (context: AuditContext) =>
    logAuditEvent("QUESTIONNAIRE_SUBMITTED", context),

  scoreComputed: (context: AuditContext) =>
    logAuditEvent("SCORE_COMPUTED", context),

  clinicianViewedChart: (context: AuditContext) =>
    logAuditEvent("CLINICIAN_VIEWED_CHART", context),

  patientCreated: (context: AuditContext) =>
    logAuditEvent("PATIENT_CREATED", context),

  patientUpdated: (context: AuditContext) =>
    logAuditEvent("PATIENT_UPDATED", context),

  appointmentCreated: (context: AuditContext) =>
    logAuditEvent("APPOINTMENT_CREATED", context),

  appointmentCancelled: (context: AuditContext) =>
    logAuditEvent("APPOINTMENT_CANCELLED", context),

  userLogin: (context: AuditContext) =>
    logAuditEvent("USER_LOGIN", context),
};
