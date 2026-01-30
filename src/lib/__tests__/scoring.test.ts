import { describe, it, expect } from "vitest";
import {
  scorePHQ9,
  scoreGAD7,
  scoreMeasure,
  getSeverityBand,
  PHQ9_SEVERITY_BANDS,
  GAD7_SEVERITY_BANDS,
  isElevated,
  needsFollowUp,
  Answer,
} from "../scoring";

describe("PHQ-9 Scoring", () => {
  it("scores all zeros as minimal (0)", () => {
    const answers: Answer[] = Array(9)
      .fill(null)
      .map((_, i) => ({ questionNum: i + 1, value: 0 }));
    const result = scorePHQ9(answers);
    expect(result.totalScore).toBe(0);
    expect(result.severityBand).toBe("minimal");
  });

  it("scores all threes as severe (27)", () => {
    const answers: Answer[] = Array(9)
      .fill(null)
      .map((_, i) => ({ questionNum: i + 1, value: 3 }));
    const result = scorePHQ9(answers);
    expect(result.totalScore).toBe(27);
    expect(result.severityBand).toBe("severe");
  });

  it("scores 5 as mild", () => {
    const answers: Answer[] = [
      { questionNum: 1, value: 1 },
      { questionNum: 2, value: 1 },
      { questionNum: 3, value: 1 },
      { questionNum: 4, value: 1 },
      { questionNum: 5, value: 1 },
      { questionNum: 6, value: 0 },
      { questionNum: 7, value: 0 },
      { questionNum: 8, value: 0 },
      { questionNum: 9, value: 0 },
    ];
    const result = scorePHQ9(answers);
    expect(result.totalScore).toBe(5);
    expect(result.severityBand).toBe("mild");
  });

  it("scores 10 as moderate", () => {
    const answers: Answer[] = [
      { questionNum: 1, value: 2 },
      { questionNum: 2, value: 2 },
      { questionNum: 3, value: 2 },
      { questionNum: 4, value: 2 },
      { questionNum: 5, value: 2 },
      { questionNum: 6, value: 0 },
      { questionNum: 7, value: 0 },
      { questionNum: 8, value: 0 },
      { questionNum: 9, value: 0 },
    ];
    const result = scorePHQ9(answers);
    expect(result.totalScore).toBe(10);
    expect(result.severityBand).toBe("moderate");
  });

  it("scores 15 as moderately_severe", () => {
    const answers: Answer[] = [
      { questionNum: 1, value: 2 },
      { questionNum: 2, value: 2 },
      { questionNum: 3, value: 2 },
      { questionNum: 4, value: 2 },
      { questionNum: 5, value: 2 },
      { questionNum: 6, value: 2 },
      { questionNum: 7, value: 2 },
      { questionNum: 8, value: 1 },
      { questionNum: 9, value: 0 },
    ];
    const result = scorePHQ9(answers);
    expect(result.totalScore).toBe(15);
    expect(result.severityBand).toBe("moderately_severe");
  });

  it("scores 20 as severe", () => {
    const answers: Answer[] = [
      { questionNum: 1, value: 3 },
      { questionNum: 2, value: 3 },
      { questionNum: 3, value: 3 },
      { questionNum: 4, value: 3 },
      { questionNum: 5, value: 3 },
      { questionNum: 6, value: 2 },
      { questionNum: 7, value: 2 },
      { questionNum: 8, value: 1 },
      { questionNum: 9, value: 0 },
    ];
    const result = scorePHQ9(answers);
    expect(result.totalScore).toBe(20);
    expect(result.severityBand).toBe("severe");
  });

  it("throws error for empty answers", () => {
    expect(() => scorePHQ9([])).toThrow("No answers provided");
  });

  it("throws error for invalid answer values", () => {
    const answers: Answer[] = [{ questionNum: 1, value: 5 }];
    expect(() => scorePHQ9(answers)).toThrow("Invalid answer value");
  });

  it("returns correct metadata", () => {
    const answers: Answer[] = Array(9)
      .fill(null)
      .map((_, i) => ({ questionNum: i + 1, value: 1 }));
    const result = scorePHQ9(answers);
    expect(result.maxPossibleScore).toBe(27);
    expect(result.answeredQuestions).toBe(9);
  });
});

describe("GAD-7 Scoring", () => {
  it("scores all zeros as minimal (0)", () => {
    const answers: Answer[] = Array(7)
      .fill(null)
      .map((_, i) => ({ questionNum: i + 1, value: 0 }));
    const result = scoreGAD7(answers);
    expect(result.totalScore).toBe(0);
    expect(result.severityBand).toBe("minimal");
  });

  it("scores all threes as severe (21)", () => {
    const answers: Answer[] = Array(7)
      .fill(null)
      .map((_, i) => ({ questionNum: i + 1, value: 3 }));
    const result = scoreGAD7(answers);
    expect(result.totalScore).toBe(21);
    expect(result.severityBand).toBe("severe");
  });

  it("scores 5 as mild", () => {
    const answers: Answer[] = [
      { questionNum: 1, value: 1 },
      { questionNum: 2, value: 1 },
      { questionNum: 3, value: 1 },
      { questionNum: 4, value: 1 },
      { questionNum: 5, value: 1 },
      { questionNum: 6, value: 0 },
      { questionNum: 7, value: 0 },
    ];
    const result = scoreGAD7(answers);
    expect(result.totalScore).toBe(5);
    expect(result.severityBand).toBe("mild");
  });

  it("scores 10 as moderate", () => {
    const answers: Answer[] = [
      { questionNum: 1, value: 2 },
      { questionNum: 2, value: 2 },
      { questionNum: 3, value: 2 },
      { questionNum: 4, value: 2 },
      { questionNum: 5, value: 2 },
      { questionNum: 6, value: 0 },
      { questionNum: 7, value: 0 },
    ];
    const result = scoreGAD7(answers);
    expect(result.totalScore).toBe(10);
    expect(result.severityBand).toBe("moderate");
  });

  it("scores 15+ as severe", () => {
    const answers: Answer[] = [
      { questionNum: 1, value: 3 },
      { questionNum: 2, value: 3 },
      { questionNum: 3, value: 3 },
      { questionNum: 4, value: 3 },
      { questionNum: 5, value: 3 },
      { questionNum: 6, value: 0 },
      { questionNum: 7, value: 0 },
    ];
    const result = scoreGAD7(answers);
    expect(result.totalScore).toBe(15);
    expect(result.severityBand).toBe("severe");
  });

  it("returns correct metadata", () => {
    const answers: Answer[] = Array(7)
      .fill(null)
      .map((_, i) => ({ questionNum: i + 1, value: 1 }));
    const result = scoreGAD7(answers);
    expect(result.maxPossibleScore).toBe(21);
    expect(result.answeredQuestions).toBe(7);
  });
});

describe("scoreMeasure (dynamic)", () => {
  it("routes PHQ-9 correctly", () => {
    const answers: Answer[] = Array(9)
      .fill(null)
      .map((_, i) => ({ questionNum: i + 1, value: 0 }));
    const result = scoreMeasure("PHQ-9", answers);
    expect(result.severityBand).toBe("minimal");
  });

  it("routes GAD-7 correctly", () => {
    const answers: Answer[] = Array(7)
      .fill(null)
      .map((_, i) => ({ questionNum: i + 1, value: 0 }));
    const result = scoreMeasure("GAD-7", answers);
    expect(result.severityBand).toBe("minimal");
  });

  it("handles case insensitivity", () => {
    const answers: Answer[] = Array(9)
      .fill(null)
      .map((_, i) => ({ questionNum: i + 1, value: 0 }));
    const result = scoreMeasure("phq-9", answers);
    expect(result.severityBand).toBe("minimal");
  });

  it("throws error for unknown measure", () => {
    expect(() => scoreMeasure("UNKNOWN", [])).toThrow("Unknown measure");
  });
});

describe("getSeverityBand", () => {
  it("returns correct PHQ-9 bands", () => {
    expect(getSeverityBand(0, PHQ9_SEVERITY_BANDS)).toBe("minimal");
    expect(getSeverityBand(4, PHQ9_SEVERITY_BANDS)).toBe("minimal");
    expect(getSeverityBand(5, PHQ9_SEVERITY_BANDS)).toBe("mild");
    expect(getSeverityBand(9, PHQ9_SEVERITY_BANDS)).toBe("mild");
    expect(getSeverityBand(10, PHQ9_SEVERITY_BANDS)).toBe("moderate");
    expect(getSeverityBand(14, PHQ9_SEVERITY_BANDS)).toBe("moderate");
    expect(getSeverityBand(15, PHQ9_SEVERITY_BANDS)).toBe("moderately_severe");
    expect(getSeverityBand(19, PHQ9_SEVERITY_BANDS)).toBe("moderately_severe");
    expect(getSeverityBand(20, PHQ9_SEVERITY_BANDS)).toBe("severe");
    expect(getSeverityBand(27, PHQ9_SEVERITY_BANDS)).toBe("severe");
  });

  it("returns correct GAD-7 bands", () => {
    expect(getSeverityBand(0, GAD7_SEVERITY_BANDS)).toBe("minimal");
    expect(getSeverityBand(4, GAD7_SEVERITY_BANDS)).toBe("minimal");
    expect(getSeverityBand(5, GAD7_SEVERITY_BANDS)).toBe("mild");
    expect(getSeverityBand(9, GAD7_SEVERITY_BANDS)).toBe("mild");
    expect(getSeverityBand(10, GAD7_SEVERITY_BANDS)).toBe("moderate");
    expect(getSeverityBand(14, GAD7_SEVERITY_BANDS)).toBe("moderate");
    expect(getSeverityBand(15, GAD7_SEVERITY_BANDS)).toBe("severe");
    expect(getSeverityBand(21, GAD7_SEVERITY_BANDS)).toBe("severe");
  });
});

describe("Clinical helpers", () => {
  describe("isElevated", () => {
    it("returns false for scores below 10", () => {
      expect(isElevated("PHQ-9", 9)).toBe(false);
      expect(isElevated("GAD-7", 9)).toBe(false);
    });

    it("returns true for scores >= 10", () => {
      expect(isElevated("PHQ-9", 10)).toBe(true);
      expect(isElevated("GAD-7", 10)).toBe(true);
      expect(isElevated("PHQ-9", 20)).toBe(true);
    });
  });

  describe("needsFollowUp", () => {
    it("returns false for scores below 15", () => {
      expect(needsFollowUp("PHQ-9", 14)).toBe(false);
      expect(needsFollowUp("GAD-7", 14)).toBe(false);
    });

    it("returns true for scores >= 15", () => {
      expect(needsFollowUp("PHQ-9", 15)).toBe(true);
      expect(needsFollowUp("GAD-7", 15)).toBe(true);
    });
  });
});
