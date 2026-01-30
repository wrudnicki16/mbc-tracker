/**
 * MBC Scoring Functions (Step 4)
 * Pure functions for calculating assessment scores and severity bands.
 * All scoring logic is deterministic and well-tested.
 */

// Answer format: { questionNum: number, value: number }
export interface Answer {
  questionNum: number;
  value: number;
}

export interface SeverityBand {
  label: string;
  minScore: number;
  maxScore: number;
}

export interface ScoringResult {
  totalScore: number;
  severityBand: string;
  maxPossibleScore: number;
  answeredQuestions: number;
}

// ============================================
// PHQ-9 Scoring
// ============================================

export const PHQ9_SEVERITY_BANDS: SeverityBand[] = [
  { label: "minimal", minScore: 0, maxScore: 4 },
  { label: "mild", minScore: 5, maxScore: 9 },
  { label: "moderate", minScore: 10, maxScore: 14 },
  { label: "moderately_severe", minScore: 15, maxScore: 19 },
  { label: "severe", minScore: 20, maxScore: 27 },
];

export const PHQ9_QUESTION_COUNT = 9;
export const PHQ9_MAX_SCORE = 27; // 9 questions × 3 max per question

export function scorePHQ9(answers: Answer[]): ScoringResult {
  return scoreAssessment(answers, PHQ9_SEVERITY_BANDS, PHQ9_QUESTION_COUNT);
}

// ============================================
// GAD-7 Scoring
// ============================================

export const GAD7_SEVERITY_BANDS: SeverityBand[] = [
  { label: "minimal", minScore: 0, maxScore: 4 },
  { label: "mild", minScore: 5, maxScore: 9 },
  { label: "moderate", minScore: 10, maxScore: 14 },
  { label: "severe", minScore: 15, maxScore: 21 },
];

export const GAD7_QUESTION_COUNT = 7;
export const GAD7_MAX_SCORE = 21; // 7 questions × 3 max per question

export function scoreGAD7(answers: Answer[]): ScoringResult {
  return scoreAssessment(answers, GAD7_SEVERITY_BANDS, GAD7_QUESTION_COUNT);
}

// ============================================
// Generic Scoring Function
// ============================================

export function scoreAssessment(
  answers: Answer[],
  severityBands: SeverityBand[],
  expectedQuestionCount: number
): ScoringResult {
  // Validate answers
  if (!answers || answers.length === 0) {
    throw new Error("No answers provided");
  }

  // Calculate total score
  const totalScore = answers.reduce((sum, answer) => {
    if (answer.value < 0 || answer.value > 3) {
      throw new Error(
        `Invalid answer value: ${answer.value}. Must be 0-3.`
      );
    }
    return sum + answer.value;
  }, 0);

  // Find severity band
  const severityBand = getSeverityBand(totalScore, severityBands);

  return {
    totalScore,
    severityBand,
    maxPossibleScore: expectedQuestionCount * 3,
    answeredQuestions: answers.length,
  };
}

export function getSeverityBand(
  score: number,
  bands: SeverityBand[]
): string {
  const band = bands.find((b) => score >= b.minScore && score <= b.maxScore);
  if (!band) {
    throw new Error(`Score ${score} does not fall within any severity band`);
  }
  return band.label;
}

// ============================================
// Score by Measure Name (Dynamic)
// ============================================

export function scoreMeasure(
  measureName: string,
  answers: Answer[]
): ScoringResult {
  switch (measureName.toUpperCase()) {
    case "PHQ-9":
      return scorePHQ9(answers);
    case "GAD-7":
      return scoreGAD7(answers);
    default:
      throw new Error(`Unknown measure: ${measureName}`);
  }
}

// ============================================
// Severity Band Descriptions (for UI)
// ============================================

export const SEVERITY_DESCRIPTIONS: Record<string, string> = {
  minimal: "Minimal or no symptoms",
  mild: "Mild symptoms",
  moderate: "Moderate symptoms",
  moderately_severe: "Moderately severe symptoms",
  severe: "Severe symptoms",
};

export function getSeverityDescription(band: string): string {
  return SEVERITY_DESCRIPTIONS[band] || "Unknown severity";
}

// ============================================
// Clinical Interpretation Helpers
// ============================================

export function isElevated(measureName: string, score: number): boolean {
  // PHQ-9: ≥10 suggests need for treatment
  // GAD-7: ≥10 suggests need for treatment
  return score >= 10;
}

export function needsFollowUp(measureName: string, score: number): boolean {
  const name = measureName.toUpperCase();
  if (name === "PHQ-9") {
    // Question 9 (suicidal ideation) or score ≥15 needs follow-up
    return score >= 15;
  }
  if (name === "GAD-7") {
    return score >= 15;
  }
  return false;
}
