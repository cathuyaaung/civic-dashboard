import { applicationType, cityNow, formatMeetingTime, Meeting, upcomingMeetings } from './activity';

const meeting = (name: string, start: string, cancelled = false): Meeting => ({
  id: name + start,
  name,
  start,
  location: null,
  cancelled,
  url: null,
  agendaPdf: null,
  agendaHtml: null,
});

describe('applicationType', () => {
  it('maps file-number prefixes to plain language', () => {
    expect(applicationType('SP 25 16')).toBe('Site plan');
    expect(applicationType('OZ 19 20')).toBe('Rezoning');
    expect(applicationType('OZ/OPA 24 8')).toBe('Official plan amendment & rezoning');
    expect(applicationType('H-OZ 25 3')).toBe('Lift holding provision');
    expect(applicationType('XYZ 1')).toBe('Application');
  });
});

describe('upcomingMeetings', () => {
  const meetings = [
    meeting('Council', '2026-11-25T09:30:00'),
    meeting('Committee of Adjustment', '2026-11-19T13:00:00'),
    meeting('General Committee', '2026-11-10T09:30:00'), // past
    meeting('CANCELLED Budget Committee', '2026-11-20T09:30:00', true),
    meeting('Planning and Development Committee', '2026-11-18T18:00:00'),
  ];
  const now = '2026-11-17T12:00:00';

  it('defaults to key decision-making meetings, earliest first', () => {
    expect(upcomingMeetings(meetings, now).map((m) => m.name)).toEqual([
      'Planning and Development Committee',
      'Council',
    ]);
  });

  it('can include every meeting, still skipping past and cancelled ones', () => {
    expect(upcomingMeetings(meetings, now, 'all').map((m) => m.name)).toEqual([
      'Planning and Development Committee',
      'Committee of Adjustment',
      'Council',
    ]);
  });
});

describe('time helpers', () => {
  it('formats meeting times without shifting the local time', () => {
    expect(formatMeetingTime('2026-11-18T09:30:00')).toMatch(/Wed, Nov 18, 9:30\sa\.m\./);
  });

  it('reads the current time in Mississauga', () => {
    // 2026-11-17 17:00 UTC is 12:00 in Toronto (EST, UTC−5).
    expect(cityNow(new Date('2026-11-17T17:00:00Z'))).toBe('2026-11-17T12:00:00');
  });
});
