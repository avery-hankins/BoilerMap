import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, XCircle, Users } from "lucide-react";

const ClubRequestsManager = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token"); // Adjust based on your storage key
      const response = await fetch("http://localhost:3000/api/clubs/requests", {
        credentials: "include",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      console.log("Response status:", response.status);
      console.log("Response URL:", response.url);

      if (!response.ok) {
        const text = await response.text();
        console.error("Response body:", text);
        throw new Error(
          `Failed to fetch requests: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log("Fetched requests:", data);
      setRequests(data);
      setError(null);
    } catch (err) {
      console.error("Full error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId, clubId) => {
    try {
      setProcessingRequest(requestId);
      const token = localStorage.getItem("token"); // Adjust based on your storage key

      const response = await fetch(
        `http://localhost:3000/api/clubs/${clubId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ requestId }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to accept request");
      }

      // Remove the accepted request from the list
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      alert(`Error accepting request: ${err.message}`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async (requestId, clubId) => {
    try {
      setProcessingRequest(requestId);
      const token = localStorage.getItem("token"); // Adjust based on your storage key

      const response = await fetch(
        `http://localhost:3000/api/clubs/${clubId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ requestId }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to reject request");
      }

      // Remove the rejected request from the list
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      alert(`Error rejecting request: ${err.message}`);
    } finally {
      setProcessingRequest(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-semibold text-red-900">
                Error Loading Requests
              </h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchRequests}
            className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
            <div className="flex items-center gap-3">
              <Users className="text-white" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Club Join Requests
                </h1>
                <p className="text-blue-100 mt-1">
                  Manage pending membership requests for your clubs
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-300 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No Pending Requests
                </h3>
                <p className="text-gray-500">
                  There are currently no club join requests to review.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-700 font-semibold text-sm">
                              {request.user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {request.user.username}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {request.user.firstName} {request.user.lastName}
                            </p>
                          </div>
                        </div>
                        <div className="ml-12">
                          <p className="text-sm text-gray-600">
                            Requesting to join{" "}
                            <span className="font-medium text-gray-900">
                              {request.club.name}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() =>
                            handleAccept(request.id, request.clubId)
                          }
                          disabled={processingRequest === request.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle size={18} />
                          <span className="font-medium">Accept</span>
                        </button>
                        <button
                          onClick={() =>
                            handleReject(request.id, request.clubId)
                          }
                          disabled={processingRequest === request.id}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle size={18} />
                          <span className="font-medium">Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubRequestsManager;
