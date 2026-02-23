import { API_URL } from "./config";
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      setMessage(data.message || "Password reset successful!");
    } catch {
      setMessage("Error resetting password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-main to-background-dark flex items-center justify-center p-4">
      <div className="backdrop-blur-xl bg-background-main bg-opacity-80 rounded-3xl shadow-2xl border border-primary-500 border-opacity-30 p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-text-primary mb-6 text-center">
          Reset Password
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-disabled" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-background-dark bg-opacity-50 border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-background-dark font-bold rounded-xl hover:scale-105 transition-all disabled:opacity-50"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
          {message && (
            <p className="text-center text-sm text-text-secondary mt-4">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
