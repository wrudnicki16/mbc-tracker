"use client";

/**
 * Client Questionnaire Page (Step 8)
 * Mobile-friendly form for patients to complete assessments via magic link.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Question {
  questionNum: number;
  questionText: string;
  minValue: number;
  maxValue: number;
}

interface QuestionnaireData {
  instanceId: string;
  measureName: string;
  measureDescription: string;
  patientFirstName: string;
  questions: Question[];
}

const ANSWER_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
];

export default function QuestionnairePage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QuestionnaireData | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadQuestionnaire() {
      try {
        const res = await fetch(`/api/questionnaire/${token}`);
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || "Failed to load questionnaire");
          return;
        }

        setData(json);
      } catch {
        setError("Failed to load questionnaire");
      } finally {
        setLoading(false);
      }
    }

    loadQuestionnaire();
  }, [token]);

  const handleAnswer = (questionNum: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionNum]: value }));
  };

  const allAnswered = data
    ? data.questions.every((q) => answers[q.questionNum] !== undefined)
    : false;

  const handleSubmit = async () => {
    if (!data || !allAnswered) return;

    setSubmitting(true);
    try {
      const answerArray = data.questions.map((q) => ({
        questionNum: q.questionNum,
        value: answers[q.questionNum],
      }));

      const res = await fetch(`/api/questionnaire/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerArray }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to submit");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Failed to submit questionnaire");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Load
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Thank You!
          </h1>
          <p className="text-gray-600">
            Your responses have been submitted successfully.
          </p>
          <p className="text-gray-500 text-sm mt-4">
            You may close this window.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / data.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900">
            {data.measureName}
          </h1>
          <p className="text-sm text-gray-500">
            Hi {data.patientFirstName}, please answer the questions below.
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {answeredCount} of {data.questions.length} answered
          </p>
        </div>
      </header>

      {/* Instructions */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Instructions:</strong> Over the last 2 weeks, how often have
            you been bothered by the following problems?
          </p>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {data.questions.map((question) => (
            <div
              key={question.questionNum}
              className="bg-white rounded-lg shadow-sm p-4"
            >
              <p className="font-medium text-gray-900 mb-3">
                {question.questionNum}. {question.questionText}
              </p>
              <div className="space-y-2">
                {ANSWER_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      answers[question.questionNum] === option.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q${question.questionNum}`}
                      value={option.value}
                      checked={answers[question.questionNum] === option.value}
                      onChange={() =>
                        handleAnswer(question.questionNum, option.value)
                      }
                      className="sr-only"
                    />
                    <span
                      className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                        answers[question.questionNum] === option.value
                          ? "border-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {answers[question.questionNum] === option.value && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      )}
                    </span>
                    <span className="text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit button */}
        <div className="mt-8 pb-8">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className={`w-full py-4 rounded-lg font-semibold text-white transition-colors ${
              allAnswered && !submitting
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {submitting ? "Submitting..." : "Submit Responses"}
          </button>
          {!allAnswered && (
            <p className="text-center text-sm text-gray-500 mt-2">
              Please answer all questions to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
