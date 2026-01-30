/**
 * Dashboard Layout
 * Shared layout for admin and clinician views.
 */

import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                MBC Tracker
              </Link>
              <div className="hidden md:flex ml-10 space-x-8">
                <Link
                  href="/admin"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2"
                >
                  Compliance
                </Link>
                <Link
                  href="/clinician/patients"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2"
                >
                  Patients
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500">Demo Mode</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
