import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface SignupFormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

interface SignupErrors {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  password?: string;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<SignupErrors>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const newErrors: SignupErrors = {};
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!formData.email.endsWith("@purdue.edu"))
      newErrors.email = "Email must end with @purdue.edu";
    if (!formData.password.trim()) newErrors.password = "Password is required";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        // Redirect to verify page
        navigate(`/verify?email=${encodeURIComponent(formData.email)}`);
      } else {
        alert(data.error || "Failed to send verification code.");
      }
    } catch (err) {
      alert("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light">
      <form
        onSubmit={handleSubmit}
        className="bg-surface shadow-xl rounded-2xl p-8 w-full max-w-md border-t-4 border-primary-500"
      >
        <h1 className="text-2xl font-bold text-center text-primary-600 mb-6">
          Sign Up
        </h1>

        {["firstName", "lastName", "username", "email", "password"].map(
          (field) => (
            <div key={field} className="mb-4">
              <label className="block text-sm font-medium text-text-muted mb-1 capitalize">
                {field === "username"
                  ? "Username / Display Name"
                  : field.replace(/([A-Z])/, " $1")}
              </label>
              <input
                type={field === "password" ? "password" : "text"}
                name={field}
                value={formData[field as keyof SignupFormData]}
                onChange={handleChange}
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 text-text-primary bg-background-light ${
                  errors[field as keyof SignupFormData]
                    ? "border-red-500"
                    : "border-border-light"
                }`}
              />
              {errors[field as keyof SignupFormData] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors[field as keyof SignupFormData]}
                </p>
              )}
            </div>
          ),
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-500 hover:bg-primary-600 text-text-primary font-semibold py-2 rounded-lg transition duration-200"
        >
          {loading ? "Sending..." : "Sign Up!"}
        </button>
      </form>
    </div>
  );
}
