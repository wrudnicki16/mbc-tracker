# MBC Tracker

A Measurement-Based Care (MBC) compliance monitoring system for mental health clinicians. Automates the delivery, tracking, and reporting of standardized mental health assessments (PHQ-9, GAD-7) to improve patient outcomes and ensure regulatory compliance.

## Vision

**MVP Promise:** Make it easy for a clinic to consistently collect required questionnaires (PHQ-9, GAD-7), track completion, and visualize progress over time—so they don't miss measures and can pass audits.

### Why This Matters

Measurement-Based Care is increasingly required by payers and regulatory bodies, but most clinics struggle with:
- Remembering to administer assessments at the right cadence
- Getting patients to actually complete them
- Tracking compliance across all patients
- Producing audit-ready documentation

This system solves these problems with a simple, end-to-end workflow:
1. **New patient** → Intake assessments created automatically
2. **Magic link sent** → Patient completes questionnaire on their phone
3. **Score computed** → Severity band determined using published cutoffs
4. **Clinician views trends** → PHQ-9 and GAD-7 charts over time
5. **Admin monitors compliance** → Dashboard shows completion rates and overdue assessments
6. **Audit trail** → Every action logged for compliance reporting

### Design Principles

- **End-to-end value over architecture** - Demo the full loop in 5 minutes
- **Magic links over patient portals** - No accounts needed for patients
- **Clinic-wide policy over per-payer rules** - Avoid complexity rabbit holes
- **Audit-ready from day one** - Every action traceable

## Features

- **Patient Management** - Register and manage patients with clinician assignments
- **Automated Assessment Scheduling** - Policy-driven scheduling based on appointments and intake
- **Magic Link Delivery** - Secure, tokenized links sent via email (Resend) or SMS (Twilio)
- **Questionnaire Completion** - Mobile-friendly patient interface for completing assessments
- **Score Calculation** - Automatic scoring with severity band classification
- **Compliance Dashboard** - Track completion rates, overdue assessments, and trends
- **Audit Logging** - Compliance-ready audit trail for all actions
- **Role-Based Access** - Admin and Clinician roles with appropriate permissions

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with HTTP-only cookies
- **Email:** Resend (with fake provider for local dev)
- **SMS:** Twilio (with fake provider for local dev)
- **Styling:** Tailwind CSS 4
- **Testing:** Vitest + Testing Library

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for test database)
- PostgreSQL 16+ (for production)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mbc_tracker"
JWT_SECRET="your-secure-jwt-secret"

# Optional: Email (falls back to console logging)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="MBC Tracker <noreply@yourdomain.com>"

# Optional: SMS (falls back to console logging)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_FROM_PHONE="+1234567890"
```

### 3. Set Up Database

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:seed       # Seed PHQ-9, GAD-7, and demo data
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### Demo Credentials

After seeding:
- **Admin:** admin@clinic.example / admin123
- **Clinician:** dr.smith@clinic.example / clinician123

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Clinician/Admin dashboard pages
│   │   ├── admin/            # Compliance dashboard
│   │   └── clinician/        # Patient list and progress views
│   ├── (client)/             # Patient-facing pages
│   │   └── q/[token]/        # Questionnaire completion
│   ├── api/                  # REST API routes
│   └── demo/                 # Demo page for testing questionnaires
├── lib/
│   ├── auth.ts               # JWT authentication
│   ├── audit.ts              # Audit event logging
│   ├── db.ts                 # Prisma client
│   ├── notifications.ts      # Email/SMS providers
│   ├── scheduling.ts         # Assessment scheduling
│   └── scoring.ts            # Score calculation
└── middleware.ts             # Route protection

prisma/
├── schema.prisma             # Database schema
└── seed.ts                   # PHQ-9, GAD-7 seed data
```

## Testing

```bash
npm run test              # Unit tests (watch mode)
npm run test:run          # Unit tests (once)
npm run test:integration  # Integration tests (requires Docker)
npm run test:all          # All tests
```

Integration tests use a real PostgreSQL database via Docker, testing scheduling, audit logging, and API endpoints against actual database operations.

## MBC Policy Configuration

The default MBC policy can be customized:

| Setting | Default | Description |
|---------|---------|-------------|
| `cadenceDays` | 14 | Days between assessments |
| `graceWindowDays` | 3 | Days after due date before marking overdue |
| `expirationDays` | 7 | Days until magic link expires |
| `measuresRequired` | PHQ-9, GAD-7 | Assessments to administer |
| `requireAtIntake` | true | Create assessments for new patients |

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests (watch) |
| `npm run test:integration` | Run integration tests |
| `npm run test:all` | Run all tests |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed initial data |
| `npm run db:studio` | Open Prisma Studio |

---

## MVP Progress

### Completed (12-Step MVP Plan)

| Step | Description | Status |
|------|-------------|--------|
| 1 | PHQ-9 & GAD-7 measures with questions and severity bands | Done |
| 2 | User roles (Admin, Clinician) with magic links for clients | Done |
| 3 | Core data model (patients, clinicians, appointments, measures) | Done |
| 4 | Deterministic scoring with unit tests | Done |
| 5 | MBC policy configuration (cadence, grace window, expiration) | Done |
| 6 | Auto-generate measure instances for appointments | Done |
| 7 | Magic link generation with expiring tokens | Done |
| 8 | Client questionnaire UI (mobile-friendly) | Done |
| 9 | Clinician view with PHQ-9/GAD-7 trend charts | Done |
| 10 | Admin compliance dashboard with overdue tracking | Done |
| 11 | Audit logging for all key actions | Done |
| 12 | Demo flow testable in <5 minutes | Done |

### Post-MVP Extensions Completed

| Extension | Description | Status |
|-----------|-------------|--------|
| Email notifications | Resend integration with magic link templates | Done |
| SMS notifications | Twilio integration for text message delivery | Done |
| Fake providers | Console logging for local development without API keys | Done |
| Cron job endpoints | API routes for scheduled instance generation | Done |
| Integration tests | Database-level tests for scheduling and audit | Done |

## Next Steps

### Immediate (Production Readiness)

1. **Deploy cron job** - Configure Vercel cron to trigger `/api/cron/generate-instances` daily
2. **Send notifications cron** - Trigger `/api/cron/send-notifications` to batch-send pending magic links
3. **Environment setup** - Configure production Resend and Twilio API keys

### Near-Term Enhancements

4. **Appointments UI** - View and create appointments from clinician dashboard
5. **Notification preferences** - Let patients choose email vs SMS
6. **Reminder scheduling** - Send follow-up reminders for incomplete assessments
7. **Bulk patient import** - CSV upload for onboarding existing patient panels

### Future Considerations

- Additional measures (PHQ-2, AUDIT-C, PCL-5, etc.)
- EHR integrations (FHIR, HL7)
- Multi-clinic/organization support
- Patient portal for viewing own history
- Crisis detection and alerting

## License

Private - All rights reserved.
