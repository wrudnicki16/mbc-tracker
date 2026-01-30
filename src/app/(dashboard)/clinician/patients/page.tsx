"use client";

/**
 * Clinician Patients List
 * View all patients with quick access to their progress.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface Patient {
  id: string;
  externalId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  intakeDate: string;
  isActive: boolean;
  clinician: {
    id: string;
    name: string;
  };
  counts: {
    assessments: number;
    appointments: number;
  };
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadPatients() {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);

        const res = await fetch(`/api/patients?${params}`);
        const json = await res.json();
        setPatients(json.patients || []);
      } catch (error) {
        console.error("Failed to load patients:", error);
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, [search]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500">
            {patients.length} patient{patients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-4 py-2 w-64"
          />
        </div>
      </div>

      {/* Patient Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {search ? "No patients match your search" : "No patients found"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <Link
              key={patient.id}
              href={`/clinician/patients/${patient.id}`}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  {patient.externalId && (
                    <p className="text-sm text-gray-500">
                      MRN: {patient.externalId}
                    </p>
                  )}
                </div>
                {!patient.isActive && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="mt-4 flex gap-4 text-sm text-gray-500">
                <span>{patient.counts.assessments} assessments</span>
                <span>{patient.counts.appointments} appointments</span>
              </div>
              <div className="mt-2 text-sm text-gray-400">
                Intake: {new Date(patient.intakeDate).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
