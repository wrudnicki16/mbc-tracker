import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================
// PHQ-9 Data (Patient Health Questionnaire-9)
// ============================================
const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself - or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way",
];

const PHQ9_SEVERITY_BANDS = [
  { label: "minimal", minScore: 0, maxScore: 4 },
  { label: "mild", minScore: 5, maxScore: 9 },
  { label: "moderate", minScore: 10, maxScore: 14 },
  { label: "moderately_severe", minScore: 15, maxScore: 19 },
  { label: "severe", minScore: 20, maxScore: 27 },
];

// ============================================
// GAD-7 Data (Generalized Anxiety Disorder-7)
// ============================================
const GAD7_QUESTIONS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid, as if something awful might happen",
];

const GAD7_SEVERITY_BANDS = [
  { label: "minimal", minScore: 0, maxScore: 4 },
  { label: "mild", minScore: 5, maxScore: 9 },
  { label: "moderate", minScore: 10, maxScore: 14 },
  { label: "severe", minScore: 15, maxScore: 21 },
];

async function main() {
  console.log("🌱 Starting seed...");

  // ============================================
  // Step 1: Create Measures (PHQ-9 & GAD-7)
  // ============================================
  console.log("Creating measures...");

  const phq9 = await prisma.measure.upsert({
    where: { name: "PHQ-9" },
    update: {},
    create: {
      name: "PHQ-9",
      description:
        "Patient Health Questionnaire-9: A 9-item depression screening tool",
      minScore: 0,
      maxScore: 27,
      questions: {
        create: PHQ9_QUESTIONS.map((text, index) => ({
          questionNum: index + 1,
          questionText: text,
          minValue: 0,
          maxValue: 3,
        })),
      },
      severityBands: {
        create: PHQ9_SEVERITY_BANDS,
      },
    },
  });
  console.log(`  ✓ Created PHQ-9 (id: ${phq9.id})`);

  const gad7 = await prisma.measure.upsert({
    where: { name: "GAD-7" },
    update: {},
    create: {
      name: "GAD-7",
      description:
        "Generalized Anxiety Disorder-7: A 7-item anxiety screening tool",
      minScore: 0,
      maxScore: 21,
      questions: {
        create: GAD7_QUESTIONS.map((text, index) => ({
          questionNum: index + 1,
          questionText: text,
          minValue: 0,
          maxValue: 3,
        })),
      },
      severityBands: {
        create: GAD7_SEVERITY_BANDS,
      },
    },
  });
  console.log(`  ✓ Created GAD-7 (id: ${gad7.id})`);

  // ============================================
  // Step 2: Create Default MBC Policy
  // ============================================
  console.log("Creating MBC policy...");

  const policy = await prisma.mbcPolicy.upsert({
    where: { name: "default" },
    update: {},
    create: {
      name: "default",
      cadenceDays: 14,
      graceWindowDays: 3,
      expirationDays: 7,
      measuresRequired: ["PHQ-9", "GAD-7"],
      requireAtIntake: true,
    },
  });
  console.log(`  ✓ Created default policy (id: ${policy.id})`);

  // ============================================
  // Step 3: Create Demo Users & Clinicians
  // ============================================
  console.log("Creating demo users...");

  const adminPassword = await hash("admin123", 12);
  const clinicianPassword = await hash("clinician123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@clinic.example" },
    update: {},
    create: {
      email: "admin@clinic.example",
      passwordHash: adminPassword,
      firstName: "Admin",
      lastName: "User",
      role: UserRole.ADMIN,
    },
  });
  console.log(`  ✓ Created admin user (email: admin@clinic.example)`);

  const clinicianUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: "dr.smith@clinic.example" },
      update: {},
      create: {
        email: "dr.smith@clinic.example",
        passwordHash: clinicianPassword,
        firstName: "Sarah",
        lastName: "Smith",
        role: UserRole.CLINICIAN,
      },
    }),
    prisma.user.upsert({
      where: { email: "dr.jones@clinic.example" },
      update: {},
      create: {
        email: "dr.jones@clinic.example",
        passwordHash: clinicianPassword,
        firstName: "Michael",
        lastName: "Jones",
        role: UserRole.CLINICIAN,
      },
    }),
    prisma.user.upsert({
      where: { email: "dr.garcia@clinic.example" },
      update: {},
      create: {
        email: "dr.garcia@clinic.example",
        passwordHash: clinicianPassword,
        firstName: "Maria",
        lastName: "Garcia",
        role: UserRole.CLINICIAN,
      },
    }),
  ]);

  // Create clinician profiles
  const clinicians = await Promise.all(
    clinicianUsers.map((user) =>
      prisma.clinician.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      })
    )
  );
  console.log(`  ✓ Created ${clinicians.length} clinicians`);

  // ============================================
  // Step 4: Create Demo Patients
  // ============================================
  console.log("Creating demo patients...");

  const patientData = [
    { firstName: "John", lastName: "Doe", email: "wyattrudnicki@gmail.com", phone: "+14152659362" },
    { firstName: "Jane", lastName: "Smith", email: "jane.smith@email.example", phone: null },
    {
      firstName: "Robert",
      lastName: "Johnson",
      email: "robert.j@email.example",
      phone: null,
    },
    { firstName: "Emily", lastName: "Brown", email: "emily.b@email.example", phone: null },
    { firstName: "Michael", lastName: "Davis", email: "m.davis@email.example", phone: null },
  ];

  const patients = await Promise.all(
    patientData.map((data, index) =>
      prisma.patient.upsert({
        where: { externalId: `MRN-${1000 + index}` },
        update: {},
        create: {
          ...data,
          externalId: `MRN-${1000 + index}`,
          clinicianId: clinicians[index % clinicians.length].id,
          intakeDate: new Date(
            Date.now() - (30 - index * 5) * 24 * 60 * 60 * 1000
          ),
        },
      })
    )
  );
  console.log(`  ✓ Created ${patients.length} patients`);

  // ============================================
  // Step 5: Create Demo Appointments
  // ============================================
  console.log("Creating demo appointments...");

  const now = new Date();
  const appointments = [];

  for (const patient of patients) {
    const patientClinician = await prisma.patient.findUnique({
      where: { id: patient.id },
      select: { clinicianId: true },
    });

    // Past appointments
    for (let i = 3; i >= 1; i--) {
      const appt = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          clinicianId: patientClinician!.clinicianId,
          scheduledAt: new Date(now.getTime() - i * 14 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - i * 14 * 24 * 60 * 60 * 1000),
        },
      });
      appointments.push(appt);
    }

    // Upcoming appointment
    const upcomingAppt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        clinicianId: patientClinician!.clinicianId,
        scheduledAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    appointments.push(upcomingAppt);
  }
  console.log(`  ✓ Created ${appointments.length} appointments`);

  // ============================================
  // Step 6: Create Pending Measure Instances for Demo
  // ============================================
  console.log("Creating pending measure instances...");

  const today = new Date();
  const expiresAt = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  let measureInstanceCount = 0;
  for (const patient of patients) {
    // Create PHQ-9 instance
    await prisma.measureInstance.create({
      data: {
        patientId: patient.id,
        measureId: phq9.id,
        status: "PENDING",
        dueDate: today,
        expiresAt: expiresAt,
      },
    });
    measureInstanceCount++;

    // Create GAD-7 instance
    await prisma.measureInstance.create({
      data: {
        patientId: patient.id,
        measureId: gad7.id,
        status: "PENDING",
        dueDate: today,
        expiresAt: expiresAt,
      },
    });
    measureInstanceCount++;
  }
  console.log(`  ✓ Created ${measureInstanceCount} pending measure instances`);

  // ============================================
  // Summary
  // ============================================
  console.log("\n✅ Seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - Measures: 2 (PHQ-9, GAD-7)`);
  console.log(`   - Users: ${clinicianUsers.length + 1}`);
  console.log(`   - Clinicians: ${clinicians.length}`);
  console.log(`   - Patients: ${patients.length}`);
  console.log(`   - Appointments: ${appointments.length}`);
  console.log(`   - Pending Measure Instances: ${measureInstanceCount}`);
  console.log("\n🔐 Demo Credentials:");
  console.log("   Admin:     admin@clinic.example / admin123");
  console.log("   Clinician: dr.smith@clinic.example / clinician123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
