import { API_URL } from "./config";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  User,
  Mail,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function ClubRegistrationForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    clubName: "",
    clubDescription: "",
    clubEmail: "",
    facultyAdvisor: "",
    facultyEmail: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("You must be logged in to submit a club registration");
      }

      const response = await fetch(
        `${API_URL}/api/club-registrations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit registration");
      }

      setSubmitSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6 flex items-center justify-center">
        <div className="max-w-lg w-full bg-surface rounded-lg shadow-2xl border border-border-dark p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-secondary mb-4">
            Registration Submitted!
          </h2>
          <p className="text-text-tertiary mb-6">
            Your club registration request has been submitted successfully. You
            will receive an email confirmation shortly. An administrator will
            review your request and notify you of the decision.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-gradient-to-r from-accent-dark to-accent text-white font-semibold rounded-lg hover:from-accent hover:to-accent-light transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 px-4 py-2 bg-surface-light hover:bg-surface-lighter text-text-secondary rounded-lg transition"
        >
          ← Back
        </button>

        <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark">
          <div className="bg-gradient-to-r from-accent-dark to-accent text-white p-6">
            <div className="flex items-center space-x-3">
              <Building2 className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Register a New Club</h1>
                <p className="text-text-secondary mt-1">
                  Submit your club for approval on BoilerMap
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-900 bg-opacity-30 border border-red-600 rounded-lg flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Club Name */}
            <div>
              <label className="block text-text-secondary font-semibold mb-2">
                Club Name *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  name="clubName"
                  value={formData.clubName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your club's name"
                  className="w-full pl-10 pr-4 py-3 bg-surface-light border border-border-dark rounded-lg text-text-secondary placeholder-text-muted focus:outline-none focus:border-accent transition"
                />
              </div>
            </div>

            {/* Club Description */}
            <div>
              <label className="block text-text-secondary font-semibold mb-2">
                Club Description
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-text-muted" />
                <textarea
                  name="clubDescription"
                  value={formData.clubDescription}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Describe your club's purpose, activities, and goals..."
                  className="w-full pl-10 pr-4 py-3 bg-surface-light border border-border-dark rounded-lg text-text-secondary placeholder-text-muted focus:outline-none focus:border-accent transition resize-none"
                />
              </div>
            </div>

            {/* Club Email */}
            <div>
              <label className="block text-text-secondary font-semibold mb-2">
                Club Email (Optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="email"
                  name="clubEmail"
                  value={formData.clubEmail}
                  onChange={handleInputChange}
                  placeholder="club@purdue.edu"
                  className="w-full pl-10 pr-4 py-3 bg-surface-light border border-border-dark rounded-lg text-text-secondary placeholder-text-muted focus:outline-none focus:border-accent transition"
                />
              </div>
            </div>

            {/* Faculty Advisor Section */}
            <div className="border-t border-border-dark pt-6">
              <h3 className="text-lg font-semibold text-text-secondary mb-4">
                Faculty Advisor Information
              </h3>

              {/* Faculty Advisor Name */}
              <div className="mb-4">
                <label className="block text-text-secondary font-semibold mb-2">
                  Faculty Advisor Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="text"
                    name="facultyAdvisor"
                    value={formData.facultyAdvisor}
                    onChange={handleInputChange}
                    required
                    placeholder="Dr. John Smith"
                    className="w-full pl-10 pr-4 py-3 bg-surface-light border border-border-dark rounded-lg text-text-secondary placeholder-text-muted focus:outline-none focus:border-accent transition"
                  />
                </div>
              </div>

              {/* Faculty Advisor Email */}
              <div>
                <label className="block text-text-secondary font-semibold mb-2">
                  Faculty Advisor Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="email"
                    name="facultyEmail"
                    value={formData.facultyEmail}
                    onChange={handleInputChange}
                    required
                    placeholder="advisor@purdue.edu"
                    className="w-full pl-10 pr-4 py-3 bg-surface-light border border-border-dark rounded-lg text-text-secondary placeholder-text-muted focus:outline-none focus:border-accent transition"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-accent-dark to-accent text-white font-semibold rounded-lg hover:from-accent hover:to-accent-light transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Submit Registration Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
