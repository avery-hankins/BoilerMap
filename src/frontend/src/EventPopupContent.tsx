import React, { useState, useEffect } from "react";
import defaultBuildingImg from "../images/purdue_default.jpg";

interface EventPopupProps {
  buildingCode?: string;
  imageUrl?: string;
}

export default function EventPopupContent({
  buildingCode = "unknown_code",
  imageUrl = defaultBuildingImg,
}: EventPopupProps) {
  const [buildingName, setBuildingName] = useState<string>("Loading...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBuildingName = async () => {
      if (buildingCode === "unknown_code") {
        setBuildingName("Unknown Building");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(
          `https://api.purdue.io/odata/Buildings?$filter=ShortCode eq '${buildingCode}'&$select=Name`,
          {
            headers: { Accept: "application/json" },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.value && data.value.length > 0) {
          setBuildingName(data.value[0].Name);
        } else {
          setBuildingName(`Building ${buildingCode}`);
        }
      } catch (error) {
        console.error("Error fetching building name:", error);
        setBuildingName(`Building ${buildingCode}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuildingName();
  }, [buildingCode]);

  return (
    <div className="w-80">
      {/* Building Image */}
      <div className="w-76 h-40 mb-3 rounded-lg overflow-hidden">
        <img
          src={imageUrl}
          alt={buildingName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Building Name */}
      <h1 className="w-76 text-xl font-semibold text-accent-dark text-center">
        {isLoading ? (
          <span className="text-text-muted">Loading...</span>
        ) : (
          buildingName
        )}
      </h1>
    </div>
  );
}
