/**
 * Integration Test Setup
 * Global setup/teardown for database lifecycle
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, beforeEach } from "vitest";
import * as dotenv from "dotenv";

// Load test environment
dotenv.config({ path: ".env.test" });

// Create the pool and client immediately (at module load time)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL not set in .env.test");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

// PHQ-9 and GAD-7 seed data
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

async function seedBaseData() {
  // Create PHQ-9
  await prisma.measure.upsert({
    where: { name: "PHQ-9" },
    update: {},
    create: {
      name: "PHQ-9",
      description: "Patient Health Questionnaire-9: A 9-item depression screening tool",
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

  // Create GAD-7
  await prisma.measure.upsert({
    where: { name: "GAD-7" },
    update: {},
    create: {
      name: "GAD-7",
      description: "Generalized Anxiety Disorder-7: A 7-item anxiety screening tool",
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
}

async function cleanDatabase() {
  // Delete in order respecting foreign key constraints
  await prisma.measureResponse.deleteMany();
  await prisma.measureInstance.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.clinician.deleteMany();
  await prisma.user.deleteMany();
  await prisma.mbcPolicy.deleteMany();
  // Keep measures and their questions/bands for tests
}

beforeAll(async () => {
  // Connect and seed base data
  await prisma.$connect();
  await seedBaseData();
});

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

beforeEach(async () => {
  // Clean non-base data before each test
  await cleanDatabase();
});
