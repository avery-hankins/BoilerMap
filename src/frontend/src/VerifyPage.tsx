import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function VerifyPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const email = new URLSearchParams(search).get("email");

  const [code, setCode] = useState("");
  const [timer, setTimer] = useState(300); // 5 mins = 300 seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!code.trim()) return alert("Please enter your code.");

    try {
      const res = await fetch("http://localhost:3000/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Verification successful! You can now log in.");
        navigate("/");
      } else {
        alert(data.error || "Invalid or expired code.");
      }
    } catch {
      alert("Something went wrong.");
    }
  };

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light">
      <form
        onSubmit={handleVerify}
        className="bg-surface shadow-xl rounded-2xl p-8 w-full max-w-md border-t-4 border-primary-500"
      >
        <h1 className="text-2xl font-bold text-center text-primary-600 mb-6">
          Verify Your Email
        </h1>

        <p className="text-sm text-text-muted mb-4 text-center">
          A 6-digit code was sent to{" "}
          <span className="font-semibold">{email}</span>
        </p>

        <input
          type="text"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 text-center text-xl tracking-widest text-text-primary bg-background-light border-border-light"
          placeholder="Enter code"
        />

        <p className="text-center text-sm text-text-disabled mt-2">
          Expires in {minutes}:{seconds.toString().padStart(2, "0")}
        </p>

        <button
          type="submit"
          disabled={timer <= 0}
          className="w-full bg-primary-500 hover:bg-primary-600 text-text-primary font-semibold py-2 rounded-lg mt-6 transition duration-200 disabled:opacity-50"
        >
          Verify
        </button>

        {timer <= 0 && (
          <p className="text-center text-red-500 text-sm mt-2">
            Code expired. Please sign up again.
          </p>
        )}
      </form>
    </div>
  );
}
