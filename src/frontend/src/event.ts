export interface Event {
  id: number;
  clubId: number;
  roomId: number;
  bookingId: number;
  startTime: string;
  endTime: string;
  description: string | null;
  popularityCount?: number;
  club?: {
    id: number;
    name: string;
  };
  room?: {
    buildingCode: string;
    roomNum: string;
  };
  booking?: {
    description: string | null;
    expectedAttendance: number | null;
  };
  _count?: {
    rsvps: number;
  };
}

export interface EventWithRelations {
  id: number;
  clubId: number;
  roomId: number;
  bookingId: number;
  startTime: string;
  endTime: string;
  description: string | null;
  popularityCount?: number;
  club?: {
    id: number;
    name: string;
  };
  room?: {
    buildingCode: string;
    roomNum: string;
  };
  booking?: {
    description: string | null;
    expectedAttendance: number | null;
  };
  _count?: {
    rsvps: number;
  };
}
