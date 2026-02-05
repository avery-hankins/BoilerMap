import React, { useState, useEffect } from "react";
import { DoorOpen } from "lucide-react";
import defaultBuildingImg from "../images/purdue_default.jpg";

interface Room {
  id: string;
  number: string;
  // capacity?: number;
}

interface BuildingPopupProps {
  name?: string;
  buildingCode?: string;
  imageUrl?: string;
}

export default function BuildingPopupContent({
  name = "Unknown",
  buildingCode = "unknown_code",
  imageUrl = defaultBuildingImg,
}: BuildingPopupProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buildingId, setBuildingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBuildingAndRooms = async () => {
      if (buildingCode === "unknown_code") {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // First, get the building ID from the building code
        const buildingResponse = await fetch(
          `https://api.purdue.io/odata/Buildings?$filter=ShortCode eq '${buildingCode}'&$select=Id`,
          {
            headers: { Accept: "application/json" },
          },
        );

        if (!buildingResponse.ok) {
          throw new Error(`HTTP ${buildingResponse.status}`);
        }

        const buildingData = await buildingResponse.json();

        if (buildingData.value && buildingData.value.length > 0) {
          const fetchedBuildingId = buildingData.value[0].Id;
          setBuildingId(fetchedBuildingId);

          // Now fetch rooms for this building
          const roomsResponse = await fetch(
            `https://api.purdue.io/odata/Rooms?$filter=BuildingId eq ${fetchedBuildingId}&$select=Id,Number&$orderby=Number`,
            {
              headers: { Accept: "application/json" },
            },
          );

          if (!roomsResponse.ok) {
            throw new Error(`HTTP ${roomsResponse.status}`);
          }

          const roomsData = await roomsResponse.json();

          console.log("room data: ", roomsData);

          if (roomsData.value) {
            const formattedRooms: Room[] = roomsData.value.map((room: any) => ({
              id: room.Id || room.RoomId,
              number: room.Number,
              // capacity: room.Capacity,
            }));
            setRooms(formattedRooms);
          }
        }
      } catch (error) {
        console.error("Error fetching building rooms:", error);
        setRooms([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuildingAndRooms();
  }, [buildingCode]);

  const handleViewRooms = () => {
    window.location.href = `/room_listing?id=${encodeURIComponent(buildingCode)}`;
  };

  return (
    <div className="w-80 max-h-96 overflow-y-auto">
      {/* Building Image */}
      <div className="x-76 w-full h-32 mb-3 rounded-lg overflow-hidden">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      </div>

      {/* Building Name */}
      <h1 className="x-76 text-xl font-semibold text-accent-dark mb-4">
        {name}
      </h1>

      {/* Available Rooms Section */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-1">
          <DoorOpen size={16} />
          Room List
        </h2>

        {isLoading ? (
          <div className="text-sm text-text-muted pl-5">Loading rooms...</div>
        ) : rooms.length === 0 ? (
          <div className="text-sm text-text-muted pl-5">No rooms found</div>
        ) : (
          <ul className="space-y-1 mb-2">
            {rooms.slice(0, 5).map((room) => (
              <li key={room.id} className="text-sm text-text-tertiary pl-5">
                Room {room.number}
                {/* {room.capacity && (
                  <span className="text-text-muted"> • {room.capacity} seats</span>
                )} */}
              </li>
            ))}
          </ul>
        )}

        {rooms.length > 5 && (
          <div className="text-xs text-text-muted pl-5 mt-1">
            + {rooms.length - 5} more rooms
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="x-76 flex flex-col gap-2 pt-2 border-t border-border-light">
        <button
          onClick={handleViewRooms}
          className="px-4 py-2 bg-accent-dark hover:bg-accent-darker text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <DoorOpen size={16} />
          View All Rooms
        </button>
      </div>
    </div>
  );
}
