import React, { useState, ChangeEvent } from "react";
import { Home, Mail, AlertCircle, ArrowLeft, Send } from "lucide-react";

interface EmailData {
  name: string;
  email: string;
  message: string;
}

export default function Error404Page() {
  const [showEmailForm, setShowEmailForm] = useState<boolean>(false);
  const [emailData, setEmailData] = useState<EmailData>({
    name: "",
    email: "",
    message: "",
  });
  const [isSending, setIsSending] = useState<boolean>(false);

  const handleEmailChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    const { name, value } = e.target;
    setEmailData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSendEmail = (): void => {
    if (!emailData.name || !emailData.email || !emailData.message) {
      alert("Please fill in all fields");
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      alert("Support email sent! We'll get back to you shortly.");
      setEmailData({ name: "", email: "", message: "" });
      setShowEmailForm(false);
      setIsSending(false);
    }, 1500);
  };

  const handleGoHome = (): void => {
    alert("Redirecting to home page...");
    window.location.href = "/";
  };

  const handleGoBack = (): void => {
    alert("Going back to previous page...");
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Main 404 Card */}
        <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark mb-6">
          {/* Header with 404 */}
          <div className="bg-gradient-to-r from-accent-dark to-accent text-white p-12 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-24 h-24" />
            </div>
            <h1 className="text-8xl font-bold mb-2">404</h1>
            <p className="text-2xl text-text-secondary">Page Not Found</p>
          </div>

          {/* Content */}
          <div className="p-8 text-center">
            <p className="text-text-tertiary text-lg mb-8">
              Oops! The page you&apos;re looking for doesn&apos;t exist. It
              might have been moved or deleted.
            </p>

            {/* Action Buttons */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={handleGoBack}
                className="flex items-center justify-center space-x-3 px-6 py-4 bg-surface-light hover:bg-surface-lighter text-text-secondary rounded-lg transition border border-border-light hover:border-border"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-semibold">Go Back</span>
              </button>

              <button
                onClick={handleGoHome}
                className="flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-accent-dark to-accent hover:from-accent hover:to-accent-light text-white rounded-lg transition shadow-lg transform hover:scale-105"
              >
                <Home className="w-5 h-5" />
                <span className="font-semibold">Go to Home</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-dark"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-surface text-text-muted text-sm">
                  or
                </span>
              </div>
            </div>

            {/* Contact Support */}
            <button
              onClick={() => setShowEmailForm(!showEmailForm)}
              className="flex items-center justify-center space-x-3 px-6 py-3 bg-surface-light hover:bg-surface-lighter text-text-secondary rounded-lg transition border border-border-light hover:border-accent w-full"
            >
              <Mail className="w-5 h-5" />
              <span className="font-semibold">Contact Support</span>
            </button>
          </div>
        </div>

        {/* Email Support Form (Expandable) */}
        {showEmailForm && (
          <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border-dark animate-fadeIn">
            <div className="bg-gradient-to-r from-accent-dark to-accent text-white p-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-6 h-6" />
                <h2 className="text-xl font-bold">Email Support</h2>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-text-tertiary text-sm mb-4">
                Can&apos;t find what you&apos;re looking for? Send us a message
                and we&apos;ll help you out.
              </p>

              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-text-secondary font-semibold mb-2"
                >
                  Your Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={emailData.name}
                  onChange={handleEmailChange}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-text-secondary font-semibold mb-2"
                >
                  Your Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={emailData.email}
                  onChange={handleEmailChange}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
                />
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-text-secondary font-semibold mb-2"
                >
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={emailData.message}
                  onChange={handleEmailChange}
                  rows={5}
                  placeholder="Describe the issue or what you were looking for..."
                  className="w-full px-4 py-3 bg-surface-light border border-border-light rounded-lg text-text-secondary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowEmailForm(false)}
                  className="flex-1 px-6 py-3 bg-surface-light hover:bg-surface-lighter text-text-secondary rounded-lg transition border border-border-light"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isSending}
                  className="flex-1 bg-gradient-to-r from-accent-dark to-accent hover:from-accent hover:to-accent-light text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                  <span>{isSending ? "Sending..." : "Send Message"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center mt-6">
          <p className="text-text-muted text-sm">BoilerMap</p>
        </div>
      </div>
    </div>
  );
}
