import { Navigate } from "react-router-dom";
import React, { useState, useEffect } from "react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null); // null = loading, true = verified, false = invalid

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("token");

      // No token? Not verified
      if (!token) {
        setIsVerified(false);
        return;
      }

      try {
        // Call your backend to verify
        const response = await fetch("http://localhost:3000/api/verify", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setIsVerified(true); // Token is valid
        } else {
          localStorage.removeItem("token"); // Clear invalid token
          setIsVerified(false);
        }
      } catch (error) {
        console.error("Token verification failed:", error);
        localStorage.removeItem("token");
        setIsVerified(false);
      }
    };

    verifyToken();
  }, []);

  // Still checking token
  if (isVerified === null) {
    return <div>Loading...</div>;
  }

  // Token verified? Show page. Otherwise redirect to login
  return isVerified ? children : <Navigate to="/profile" />;
}

export default ProtectedRoute;
