"use client";

/**
 * Demo Page
 * Lists all pending questionnaire links for testing purposes.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface MeasureInstance {
  id: string;
  token: string;
  status: string;
  measureName: string;
  dueDate: string;
  patientName: string;
  patientId: string;
}

interface GroupedInstances {
  [patientId: string]: {
    patientName: string;
    instances: MeasureInstance[];
  };
}

export default function DemoPage() {
  const [instances, setInstances] = useState<MeasureInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInstances() {
      try {
        const res = await fetch("/api/demo/questionnaires");
        const json = await res.json();
        setInstances(json.instances || []);
      } catch (error) {
        console.error("Failed to load questionnaires:", error);
      } finally {
        setLoading(false);
      }
    }
    loadInstances();
  }, []);

  // Group by patient
  const grouped: GroupedInstances = instances.reduce((acc, instance) => {
    if (!acc[instance.patientId]) {
      acc[instance.patientId] = {
        patientName: instance.patientName,
        instances: [],
      };
    }
    acc[instance.patientId].instances.push(instance);
    return acc;
  }, {} as GroupedInstances);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-gray-100 text-gray-600";
      case "STARTED":
        return "bg-yellow-100 text-yellow-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "EXPIRED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
            &larr; Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">
            Demo Questionnaire Links
          </h1>
          <p className="text-gray-600 mt-2">
            Click any link below to test the questionnaire flow. These are
            pending assessments created from seed data.
          </p>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No pending questionnaires found.</p>
            <p className="text-sm text-gray-400 mt-2">
              Run{" "}
              <code className="bg-gray-100 px-2 py-1 rounded">
                npx prisma db push && npx prisma db seed
              </code>{" "}
              to create demo data.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([patientId, group]) => (
              <div
                key={patientId}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <h2 className="font-semibold text-gray-900">
                    {group.patientName}
                  </h2>
                </div>
                <div className="divide-y">
                  {group.instances.map((instance) => (
                    <div
                      key={instance.id}
                      className="px-6 py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-gray-900">
                          {instance.measureName}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusBadge(instance.status)}`}
                        >
                          {instance.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          Due: {new Date(instance.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {instance.status !== "COMPLETED" &&
                        instance.status !== "EXPIRED" ? (
                          <Link
                            href={`/q/${instance.token}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
                          >
                            Open Questionnaire
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">
                            {instance.status === "COMPLETED"
                              ? "Already completed"
                              : "Link expired"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">Testing Flow</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Click &quot;Open Questionnaire&quot; for any assessment</li>
            <li>Answer all questions and submit</li>
            <li>
              Visit{" "}
              <Link href="/clinician/patients" className="underline">
                Patient Progress
              </Link>{" "}
              to see the score
            </li>
            <li>
              Visit{" "}
              <Link href="/admin" className="underline">
                Compliance Dashboard
              </Link>{" "}
              to see updated metrics
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
