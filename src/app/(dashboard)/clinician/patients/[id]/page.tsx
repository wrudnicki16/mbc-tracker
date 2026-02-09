"use client";

/**
 * Clinician Patient Progress View (Step 9)
 * Shows PHQ-9 and GAD-7 trends with appointment markers.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ChartData {
  data: Array<{
    date: string;
    score: number;
    severityBand: string;
  }>;
  trend: "improving" | "stable" | "worsening" | "insufficient";
  latestScore: number | null;
  latestBand: string | null;
}

interface PatientProgress {
  patient: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    intakeDate: string;
    clinician: string;
  };
  charts: {
    phq9: ChartData;
    gad7: ChartData;
  };
  appointments: Array<{
    id: string;
    date: string;
    completed: boolean;
    cancelled: boolean;
  }>;
  pendingAssessments: Array<{
    id: string;
    measure: string;
    dueDate: string;
    status: string;
    token: string;
  }>;
  responseCount: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  minimal: "bg-green-100 text-green-800",
  mild: "bg-yellow-100 text-yellow-800",
  moderate: "bg-orange-100 text-orange-800",
  moderately_severe: "bg-red-100 text-red-800",
  severe: "bg-red-200 text-red-900",
};

const TREND_LABELS: Record<string, { label: string; color: string }> = {
  improving: { label: "Improving", color: "text-green-600" },
  stable: { label: "Stable", color: "text-gray-600" },
  worsening: { label: "Worsening", color: "text-red-600" },
  insufficient: { label: "Not enough data", color: "text-gray-400" },
};

export default function PatientProgressPage() {
  const params = useParams();
  const patientId = params.id as string;

  const [data, setData] = useState<PatientProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<Record<string, "sending" | "sent" | "error">>({});
  const [smsStatus, setSmsStatus] = useState<Record<string, "sending" | "sent" | "error">>({});

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/patients/${patientId}/progress`);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Failed to load patient progress:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [patientId]);

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/q/${token}`;
    await navigator.clipboard.writeText(url);
    setCopySuccess(token);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const sendEmail = async (instanceId: string) => {
    setEmailStatus((prev) => ({ ...prev, [instanceId]: "sending" }));
    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, channel: "email" }),
      });
      if (res.ok) {
        setEmailStatus((prev) => ({ ...prev, [instanceId]: "sent" }));
        // Update the assessment status in local state
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pendingAssessments: prev.pendingAssessments.map((a) =>
              a.id === instanceId ? { ...a, status: "SENT" } : a
            ),
          };
        });
      } else {
        setEmailStatus((prev) => ({ ...prev, [instanceId]: "error" }));
      }
    } catch {
      setEmailStatus((prev) => ({ ...prev, [instanceId]: "error" }));
    }
  };

  const sendSms = async (instanceId: string) => {
    setSmsStatus((prev) => ({ ...prev, [instanceId]: "sending" }));
    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, channel: "sms" }),
      });
      if (res.ok) {
        setSmsStatus((prev) => ({ ...prev, [instanceId]: "sent" }));
        // Update the assessment status in local state
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pendingAssessments: prev.pendingAssessments.map((a) =>
              a.id === instanceId ? { ...a, status: "SENT" } : a
            ),
          };
        });
      } else {
        setSmsStatus((prev) => ({ ...prev, [instanceId]: "error" }));
      }
    } catch {
      setSmsStatus((prev) => ({ ...prev, [instanceId]: "error" }));
    }
  };

  const exportCSV = () => {
    if (!data) return;

    const rows = [
      ["Date", "Measure", "Score", "Severity"],
      ...data.charts.phq9.data.map((d) => [
        new Date(d.date).toLocaleDateString(),
        "PHQ-9",
        d.score.toString(),
        d.severityBand,
      ]),
      ...data.charts.gad7.data.map((d) => [
        new Date(d.date).toLocaleDateString(),
        "GAD-7",
        d.score.toString(),
        d.severityBand,
      ]),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.patient.name.replace(/\s+/g, "-")}-progress.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">Patient not found</div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {data.patient.name}
          </h1>
          <p className="text-gray-500">
            Intake: {new Date(data.patient.intakeDate).toLocaleDateString()} •
            Clinician: {data.patient.clinician}
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-700"
        >
          Download CSV
        </button>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ScoreCard title="PHQ-9 (Depression)" chart={data.charts.phq9} maxScore={27} />
        <ScoreCard title="GAD-7 (Anxiety)" chart={data.charts.gad7} maxScore={21} />
      </div>

      {/* Pending Assessments */}
      {data.pendingAssessments.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Assessments
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {data.pendingAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium">{assessment.measure}</span>
                    <span className="text-gray-500 ml-2">
                      Due: {new Date(assessment.dueDate).toLocaleDateString()}
                    </span>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs ${
                        assessment.status === "STARTED"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {assessment.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/q/${assessment.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Open
                    </a>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => copyLink(assessment.token)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {copySuccess === assessment.token ? "Copied!" : "Copy Link"}
                    </button>
                    {data.patient.email && (assessment.status === "PENDING" || assessment.status === "SENT") && (
                      <>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => sendEmail(assessment.id)}
                          disabled={emailStatus[assessment.id] === "sending"}
                          className={`text-sm ${
                            emailStatus[assessment.id] === "sent"
                              ? "text-green-600"
                              : emailStatus[assessment.id] === "error"
                                ? "text-red-600"
                                : emailStatus[assessment.id] === "sending"
                                  ? "text-gray-400"
                                  : "text-blue-600 hover:text-blue-800"
                          }`}
                        >
                          {emailStatus[assessment.id] === "sending"
                            ? "Sending..."
                            : emailStatus[assessment.id] === "sent"
                              ? "Sent!"
                              : emailStatus[assessment.id] === "error"
                                ? "Failed"
                                : "Send Email"}
                        </button>
                      </>
                    )}
                    {data.patient.phone && (assessment.status === "PENDING" || assessment.status === "SENT") && (
                      <>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => sendSms(assessment.id)}
                          disabled={smsStatus[assessment.id] === "sending"}
                          className={`text-sm ${
                            smsStatus[assessment.id] === "sent"
                              ? "text-green-600"
                              : smsStatus[assessment.id] === "error"
                                ? "text-red-600"
                                : smsStatus[assessment.id] === "sending"
                                  ? "text-gray-400"
                                  : "text-blue-600 hover:text-blue-800"
                          }`}
                        >
                          {smsStatus[assessment.id] === "sending"
                            ? "Sending..."
                            : smsStatus[assessment.id] === "sent"
                              ? "Sent!"
                              : smsStatus[assessment.id] === "error"
                                ? "Failed"
                                : "Send SMS"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Response History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Response History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  PHQ-9
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  GAD-7
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getAllDates(data.charts).map((date) => {
                const phq9 = data.charts.phq9.data.find(
                  (d) => new Date(d.date).toDateString() === date.toDateString()
                );
                const gad7 = data.charts.gad7.data.find(
                  (d) => new Date(d.date).toDateString() === date.toDateString()
                );
                return (
                  <tr key={date.toISOString()} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {date.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {phq9 ? (
                        <span
                          className={`px-2 py-1 rounded ${SEVERITY_COLORS[phq9.severityBand]}`}
                        >
                          {phq9.score} ({phq9.severityBand})
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {gad7 ? (
                        <span
                          className={`px-2 py-1 rounded ${SEVERITY_COLORS[gad7.severityBand]}`}
                        >
                          {gad7.score} ({gad7.severityBand})
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {data.responseCount === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No responses yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({
  title,
  chart,
  maxScore,
}: {
  title: string;
  chart: ChartData;
  maxScore: number;
}) {
  const trend = TREND_LABELS[chart.trend];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`text-sm ${trend.color}`}>{trend.label}</span>
      </div>

      {chart.latestScore !== null ? (
        <>
          <div className="flex items-end gap-4 mb-4">
            <span className="text-4xl font-bold text-gray-900">
              {chart.latestScore}
            </span>
            <span className="text-gray-500 mb-1">/ {maxScore}</span>
            <span
              className={`px-2 py-1 rounded text-sm mb-1 ${
                SEVERITY_COLORS[chart.latestBand || "minimal"]
              }`}
            >
              {chart.latestBand}
            </span>
          </div>

          {/* Simple bar chart */}
          <div className="space-y-2">
            {chart.data.slice(-5).map((point, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20">
                  {new Date(point.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full ${
                      point.score >= 15
                        ? "bg-red-500"
                        : point.score >= 10
                          ? "bg-orange-500"
                          : point.score >= 5
                            ? "bg-yellow-500"
                            : "bg-green-500"
                    }`}
                    style={{ width: `${(point.score / maxScore) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8">{point.score}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No assessments completed yet
        </div>
      )}
    </div>
  );
}

function getAllDates(charts: PatientProgress["charts"]): Date[] {
  const dates = new Set<string>();
  charts.phq9.data.forEach((d) => dates.add(new Date(d.date).toDateString()));
  charts.gad7.data.forEach((d) => dates.add(new Date(d.date).toDateString()));
  return Array.from(dates)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());
}
