import { createEvents, EventAttributes } from 'ics';
import { v4 as uuidv4 } from 'uuid';

/**
 * Event data structure from the database with all required information
 */
export interface CalendarEvent {
  id: number;
  startTime: Date;
  endTime: Date;
  description: string | null;
  club: {
    name: string;
  };
  room: {
    buildingCode: string;
    roomNum: string;
  };
  booking: {
    description: string | null;
  };
}

/**
 * Converts a Date object to ICS date-time array format [year, month, day, hour, minute]
 */
function dateToICSArray(date: Date): [number, number, number, number, number] {
  return [
    date.getFullYear(),
    date.getMonth() + 1, // ICS months are 1-indexed
    date.getDate(),
    date.getHours(),
    date.getMinutes()
  ];
}

/**
 * Generates an ICS calendar file content from a list of events
 * @param events - Array of events with club, room, and booking information
 * @param calendarName - Name of the calendar (e.g., "BoilerMap Events")
 * @returns ICS file content as a string, or null if generation fails
 */
export function generateICSCalendar(
  events: CalendarEvent[],
  calendarName: string = "BoilerMap Events"
): string | null {
  // Convert events to ICS format
  const icsEvents: EventAttributes[] = events.map((event) => {
    // Build location string
    const location = `${event.room.buildingCode} Room ${event.room.roomNum}`;

    // Build description with additional details
    const descriptionParts: string[] = [];
    if (event.description) {
      descriptionParts.push(event.description);
    }
    if (event.booking.description) {
      descriptionParts.push(`\n\nBooking: ${event.booking.description}`);
    }
    descriptionParts.push(`\n\nOrganized by: ${event.club.name}`);
    descriptionParts.push(`\nLocation: ${location}`);

    const fullDescription = descriptionParts.join('');

    // Create event title
    const title = event.booking.description || event.club.name;

    return {
      start: dateToICSArray(event.startTime),
      end: dateToICSArray(event.endTime),
      title,
      description: fullDescription,
      location,
      organizer: { name: event.club.name },
      uid: `boilermap-event-${event.id}@boilermap.app`,
      productId: 'BoilerMap/Calendar//EN',
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      sequence: 0,
    };
  });

  // Generate ICS file
  const { error, value } = createEvents(icsEvents);

  if (error) {
    console.error('Error generating ICS file:', error);
    return null;
  }

  return value || null;
}

/**
 * Generates CalDAV XML response for a calendar collection
 * @param userId - User ID for the calendar
 * @param events - Array of events
 * @returns XML string for CalDAV PROPFIND response
 */
export function generateCalDAVResponse(userId: number, events: CalendarEvent[]): string {
  const now = new Date().toISOString();

  const eventItems = events.map(event => {
    const icsContent = generateICSCalendar([event], 'BoilerMap Event');
    if (!icsContent) return '';

    const etag = `"${event.id}-${event.startTime.getTime()}"`;
    const eventPath = `/caldav/${userId}/events/${event.id}.ics`;

    return `
    <d:response>
      <d:href>${eventPath}</d:href>
      <d:propstat>
        <d:prop>
          <d:getetag>${etag}</d:getetag>
          <d:getcontenttype>text/calendar; charset=utf-8</d:getcontenttype>
          <d:resourcetype/>
          <cal:calendar-data>${icsContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</cal:calendar-data>
        </d:prop>
        <d:status>HTTP/1.1 200 OK</d:status>
      </d:propstat>
    </d:response>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/">
  <d:response>
    <d:href>/caldav/${userId}/</d:href>
    <d:propstat>
      <d:prop>
        <d:resourcetype>
          <d:collection/>
          <cal:calendar/>
        </d:resourcetype>
        <d:displayname>BoilerMap Events</d:displayname>
        <cal:calendar-description>Your RSVP'd events from BoilerMap</cal:calendar-description>
        <cal:supported-calendar-component-set>
          <cal:comp name="VEVENT"/>
        </cal:supported-calendar-component-set>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
  ${eventItems}
</d:multistatus>`;
}
