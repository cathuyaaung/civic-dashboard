/** Attributes on each feature of public/data/development-applications.geojson. */
export interface DevApplicationProperties {
  ApplicationNumber: string;
  /** YYYY-MM-DD */
  SubmissionDate: string;
  ApplicationStatus: string;
  ApplicationDescription: string;
  SiteAddress: string;
  ProposedUse: string;
  ResidentialUnits: number | null;
  Ward: number;
}

export interface DevApplicationCollection {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    properties: DevApplicationProperties;
    geometry: { type: 'Point'; coordinates: [lon: number, lat: number] } | null;
  }[];
}

export interface Meeting {
  id: string;
  name: string;
  /** Mississauga local time, no offset: "2026-11-19T13:00:00". */
  start: string;
  location: string | null;
  cancelled: boolean;
  url: string | null;
  agendaPdf: string | null;
  agendaHtml: string | null;
}

export interface MeetingsData {
  timeZone: string;
  from: string;
  to: string;
  meetings: Meeting[];
}

export const CITY_TIME_ZONE = 'America/Toronto';

/**
 * Plain-language type from the application number prefix
 * (City of Mississauga file numbering).
 */
export function applicationType(applicationNumber: string): string {
  const prefix = applicationNumber.trim().split(/\s+/)[0].toUpperCase();
  switch (prefix) {
    case 'SP':
    case 'SPM':
      return 'Site plan';
    case 'OZ':
      return 'Rezoning';
    case 'OZ/OPA':
      return 'Official plan amendment & rezoning';
    case 'H-OZ':
      return 'Lift holding provision';
    default:
      return 'Application';
  }
}

/** OpenStreetMap link centred on a point. */
export function mapLink(lon: number, lat: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
}

/** Current wall-clock time in the city, in the same format as Meeting.start. */
export function cityNow(now = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: CITY_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}:${parts['second']}`;
}

/**
 * Meetings that make city-wide decisions a resident would follow. Everything
 * else (Committee of Adjustment, appeals, advisory subcommittees) is shown
 * only when the reader asks for all meetings.
 */
const KEY_MEETING =
  /^(special )?council$|^general committee$|^planning and development committee$|^budget committee$/i;

export const isKeyMeeting = (m: Meeting) => KEY_MEETING.test(m.name.trim());

/** Meetings from `now` on, not cancelled, earliest first. */
export function upcomingMeetings(
  meetings: Meeting[],
  now: string,
  scope: 'key' | 'all' = 'key',
): Meeting[] {
  return meetings
    .filter((m) => !m.cancelled && m.start >= now && (scope === 'all' || isKeyMeeting(m)))
    .sort((a, b) => a.start.localeCompare(b.start));
}

const meetingTimeFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'UTC', // Meeting.start is already local time; don't shift it.
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** "Wed, Nov 18, 9:30 a.m." */
export const formatMeetingTime = (start: string) => meetingTimeFormat.format(new Date(`${start}Z`));
