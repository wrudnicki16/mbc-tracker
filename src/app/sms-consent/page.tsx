"use client";

import { useState } from "react";
import Link from "next/link";

export default function SMSConsentPage() {
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone && agreed) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            SMS Notifications Consent
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Information about text message notifications from MBC Compliance Monitor
          </p>
        </div>

        {/* Disclosure Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            What Messages Will You Receive?
          </h2>
          <div className="space-y-4 text-gray-600">
            <p>
              By opting in to SMS notifications, you will receive text messages
              related to your mental health assessments, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Reminders to complete your PHQ-9 (depression) assessments</li>
              <li>Reminders to complete your GAD-7 (anxiety) assessments</li>
              <li>Links to access your assessment questionnaires</li>
              <li>Confirmation messages when assessments are submitted</li>
            </ul>
          </div>
        </div>

        {/* Frequency Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Message Frequency
          </h2>
          <div className="space-y-4 text-gray-600">
            <p>
              Message frequency varies based on your clinician&apos;s scheduled
              assessments. Typically, you can expect:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Assessment reminders approximately every 2 weeks</li>
              <li>Up to 2-3 reminder messages per scheduled assessment</li>
              <li>Occasional appointment or care-related notifications</li>
            </ul>
            <p className="text-sm text-gray-500 mt-4">
              <strong>Note:</strong> Message and data rates may apply. Check with
              your mobile carrier for details about your messaging plan.
            </p>
          </div>
        </div>

        {/* Sample Opt-in Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Opt-In to SMS Notifications
          </h2>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="text-green-600 text-3xl mb-2">✓</div>
              <p className="text-green-800 font-medium">
                Thank you! Your consent has been recorded.
              </p>
              <p className="text-green-600 text-sm mt-2">
                You will receive a confirmation text message shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  required
                />
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  required
                />
                <label htmlFor="consent" className="text-gray-700">
                  I agree to receive SMS notifications about my mental health
                  assessments from MBC Compliance Monitor. I understand that
                  message and data rates may apply, and I can opt out at any
                  time by replying STOP.
                </label>
              </div>

              <button
                type="submit"
                disabled={!phone || !agreed}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Subscribe to SMS Notifications
              </button>
            </form>
          )}
        </div>

        {/* Opt-out Instructions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            How to Opt Out
          </h2>
          <div className="space-y-4 text-gray-600">
            <p>You can unsubscribe from SMS notifications at any time:</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded font-mono text-sm">
                  STOP
                </span>
                <span>Reply STOP to any message to unsubscribe from all SMS notifications</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded font-mono text-sm">
                  HELP
                </span>
                <span>Reply HELP for assistance or more information</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              After opting out, you will receive a confirmation message and will
              no longer receive SMS notifications. You can re-subscribe at any time.
            </p>
          </div>
        </div>

        {/* Contact & Privacy */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Contact & Privacy Information
          </h2>
          <div className="space-y-4 text-gray-600">
            <p>
              If you have questions about our SMS notifications or need assistance:
            </p>
            <ul className="space-y-2">
              <li>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:wyattrudnicki@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  wyattrudnicki@gmail.com
                </a>
              </li>
              <li>
                <strong>Phone:</strong>{" "}
                <a
                  href="tel:+14152659362"
                  className="text-blue-600 hover:underline"
                >
                  (415) 265-9362
                </a>
              </li>
            </ul>
            <div className="pt-4 border-t border-gray-200 mt-4">
              <p className="text-sm">
                For information about how we protect your data, please review our{" "}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
                {" "}and{" "}
                <a href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-blue-600 hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
