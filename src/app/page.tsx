import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            MBC Compliance Monitor
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track PHQ-9 and GAD-7 assessments, monitor compliance, and visualize
            patient progress over time.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <Link
            href="/admin"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow"
          >
            <div className="text-blue-600 text-3xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Compliance Dashboard
            </h2>
            <p className="text-gray-600">
              View compliance metrics, overdue assessments, and export audit logs.
            </p>
          </Link>

          <Link
            href="/clinician/patients"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow"
          >
            <div className="text-blue-600 text-3xl mb-4">👥</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Patient Progress
            </h2>
            <p className="text-gray-600">
              View patient assessment history, trends, and copy questionnaire links.
            </p>
          </Link>
        </div>

        {/* Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            MVP Features
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Feature
              title="PHQ-9 & GAD-7"
              description="Standard depression and anxiety screening tools"
            />
            <Feature
              title="Magic Links"
              description="No patient accounts needed - just share a link"
            />
            <Feature
              title="Auto-Scheduling"
              description="Assessments scheduled every 2 weeks automatically"
            />
            <Feature
              title="Audit Trail"
              description="Complete compliance logging for payer audits"
            />
            <Feature
              title="Progress Charts"
              description="Visualize score trends over time"
            />
            <Feature
              title="CSV Export"
              description="Download data for reporting"
            />
          </div>
        </div>

        {/* Demo Questionnaires */}
        <Link
          href="/demo"
          className="block mt-8 p-6 bg-green-50 rounded-xl border border-green-200 hover:bg-green-100 transition-colors"
        >
          <h3 className="font-semibold text-green-900 mb-2">
            Test Questionnaires
          </h3>
          <p className="text-sm text-green-700">
            Click here to view and test questionnaire links. Complete a PHQ-9 or
            GAD-7 to see the full flow.
          </p>
        </Link>

        {/* Demo Credentials */}
        <div className="mt-4 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Demo Credentials</h3>
          <p className="text-sm text-gray-600 mb-2">
            After running <code className="bg-gray-200 px-1 rounded">npm run db:seed</code>:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              <strong>Admin:</strong> admin@clinic.example / admin123
            </li>
            <li>
              <strong>Clinician:</strong> dr.smith@clinic.example / clinician123
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="text-green-500 mt-0.5">✓</div>
      <div>
        <div className="font-medium text-gray-900">{title}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
    </div>
  );
}
