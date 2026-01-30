"use client";

/**
 * Admin Compliance Dashboard (Step 10)
 * Shows compliance metrics, overdue assessments, and audit export.
 */

import { useEffect, useState } from "react";

interface ComplianceData {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  metrics: {
    totalDue: number;
    totalCompleted: number;
    totalOverdue: number;
    complianceRate: number;
  };
  dueCount: number;
  overdueCount: number;
  overdueList: Array<{
    id: string;
    patientId: string;
    patientName: string;
    measureName: string;
    dueDate: string;
    daysPastDue: number;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/compliance?days=${days}`);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Failed to load compliance data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [days]);

  const exportAudit = () => {
    window.open("/api/compliance/audit?format=csv", "_blank");
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Compliance Dashboard
          </h1>
          <p className="text-gray-500">
            MBC assessment tracking and compliance monitoring
          </p>
        </div>
        <div className="flex gap-4">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border rounded-lg px-4 py-2"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={exportAudit}
            className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-700"
          >
            Export Audit Log
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Compliance Rate"
          value={`${data.metrics.complianceRate}%`}
          subtitle={`${data.metrics.totalCompleted} of ${data.metrics.totalDue} completed`}
          color={
            data.metrics.complianceRate >= 80
              ? "green"
              : data.metrics.complianceRate >= 60
                ? "yellow"
                : "red"
          }
        />
        <MetricCard
          title="Due Today"
          value={data.dueCount.toString()}
          subtitle="Assessments pending"
          color="blue"
        />
        <MetricCard
          title="Overdue"
          value={data.overdueCount.toString()}
          subtitle="Past grace period"
          color={data.overdueCount > 0 ? "red" : "green"}
        />
        <MetricCard
          title="Completed"
          value={data.metrics.totalCompleted.toString()}
          subtitle={`Last ${days} days`}
          color="green"
        />
      </div>

      {/* Overdue List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Overdue Assessments
          </h2>
        </div>
        {data.overdueList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No overdue assessments. Great job!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Assessment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Days Overdue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.overdueList.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={`/clinician/patients/${item.patientId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {item.patientName}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {item.measureName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {new Date(item.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          item.daysPastDue > 7
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {item.daysPastDue} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-blue-600 hover:underline text-sm">
                        Send Reminder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: "green" | "yellow" | "red" | "blue";
}) {
  const colorClasses = {
    green: "bg-green-50 border-green-200",
    yellow: "bg-yellow-50 border-yellow-200",
    red: "bg-red-50 border-red-200",
    blue: "bg-blue-50 border-blue-200",
  };

  const valueColors = {
    green: "text-green-700",
    yellow: "text-yellow-700",
    red: "text-red-700",
    blue: "text-blue-700",
  };

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${valueColors[color]}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
