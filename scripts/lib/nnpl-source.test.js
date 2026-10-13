import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIcs, selectNnplEvents, reconcileNnplEvents } from './nnpl-source.js';

const NOW = new Date('2026-10-12T12:00:00.000Z');
const CALENDAR = 'TKF/5d0a6155df82fe616b16b534';

const ALLOWLIST = {
  group: 'Newport News Public Library',
  events: [
    { id: '2578', name: 'Excel for Beginners' },
    { id: '4555', name: 'Robotics 101' },
    { id: '4570', name: 'Premiere Pro for Beginners' },
    { id: '4635', name: 'Cancelled class' },
  ],
};

function vevent({ uid, start, end = start, summary, categories = 'Event,Computer', extra = '' }) {
  return [
    'BEGIN:VEVENT',
    `UID:${CALENDAR}/${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `URL:https://calendar.nnpl.org/nnlibrary/detail/${uid.split('/')[0]}/1`,
    `SUMMARY:${summary}`,
    'DESCRIPTION:Learn spreadsheets\\, data entry\\, and formulas.\\n\\nBring a ',
    ' laptop.',
    `CATEGORIES:${categories}`,
    'LOCATION:Virgil I. Grissom Library\\,366 Deshazor Dr\\, Newport News\\, VA 23608',
    extra,
    'END:VEVENT',
  ]
    .filter(Boolean)
    .join('\r\n');
}

function feed(...vevents) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', ...vevents, 'END:VCALENDAR'].join('\r\n');
}

function select(...vevents) {
  return selectNnplEvents(parseIcs(feed(...vevents)), ALLOWLIST, NOW);
}

const EXCEL = { uid: '2578/29866455/30/0', start: '20261014T213000Z', end: '20261014T233000Z', summary: ' Excel for Beginners' };
const PREMIERE = { uid: '4570/29885610/0/0', start: '20261027T213000Z', end: '20261027T233000Z', summary: 'Premiere Pro for Beginners' };

test('maps an allowlisted event to the calendar shape', () => {
  const { events } = select(vevent(EXCEL));

  assert.deepEqual(events, [
    {
      title: 'Excel for Beginners',
      link: 'https://calendar.nnpl.org/nnlibrary/detail/2578/1',
      date: '2026-10-14T21:30:00.000Z',
      description:
        "Learn spreadsheets, data entry, and formulas.\n\nBring a laptop.\n\nRegistration required. Check availability on the library's event page.",
      source: 'nnpl',
      group: 'Newport News Public Library',
      sourceId: `${CALENDAR}/2578/29866455/30/0`,
      location: 'Virgil I. Grissom Library, 366 Deshazor Dr, Newport News, VA 23608',
      endDate: '2026-10-14T23:30:00.000Z',
    },
  ]);
});

test('omits endDate when the feed repeats the start time', () => {
  const { events } = select(vevent({ uid: '4555/29876910/0/0', start: '20261021T203000Z', summary: 'Robotics 101' }));

  assert.equal(events.length, 1);
  assert.equal('endDate' in events[0], false);
});

test('does not repeat the registration notice a listing already carries', () => {
  const listing = vevent(EXCEL).replace(
    'Bring a \r\n laptop.',
    'Bring a laptop.\\n\\n\\n\\nRegistration is required and opens on Tuesday\\, September 29',
  );

  const { events } = select(listing);

  assert.equal(
    events[0].description,
    "Learn spreadsheets, data entry, and formulas.\n\nBring a laptop.\n\nRegistration is required and opens on Tuesday, September 29\n\nCheck availability on the library's event page.",
  );
});

test('strips status markers from titles', () => {
  const { events } = select(vevent({ ...PREMIERE, summary: '**Rescheduled** Premiere Pro for Beginners' }));

  assert.equal(events[0].title, 'Premiere Pro for Beginners');
});

test('skips cancelled, past, all-day and unlisted events', () => {
  const { events } = select(
    vevent({ uid: '4635/29849460/0/0', start: '20261020T190000Z', summary: 'Clay Pumpkins', extra: 'STATUS:CANCELLED' }),
    vevent({ uid: '4635/29849461/0/0', start: '20261021T190000Z', summary: '**Cancelled** Clay Pumpkins' }),
    vevent({ ...EXCEL, uid: '2578/29800000/29/0', start: '20260914T213000Z', end: '20260914T233000Z' }),
    vevent({ uid: '2578/29900000/32/0', start: '20261120', summary: 'Excel all day' }).replace('DTSTART:', 'DTSTART;VALUE=DATE:'),
    vevent({ uid: '4687/29850630/0/0', start: '20261017T143000Z', summary: 'Preschool Storytime', categories: 'Storytime,Event' }),
  );

  assert.deepEqual(events, []);
});

test('reports unlisted tech-tagged events as candidates, once per event ID', () => {
  const { events, candidates } = select(
    vevent({ uid: '4035/29905395/6/0', start: '20261110T151500Z', summary: 'TinkerCAD', categories: 'Event,Technology,3D-Printer' }),
    vevent({ uid: '4035/29948595/7/0', start: '20261210T151500Z', summary: 'TinkerCAD', categories: 'Event,Technology,3D-Printer' }),
    vevent({ uid: '4687/29850630/0/0', start: '20261017T143000Z', summary: 'Preschool Storytime', categories: 'Storytime,Event' }),
  );

  assert.deepEqual(events, []);
  assert.deepEqual(candidates, [{ id: '4035', title: 'TinkerCAD', date: '2026-11-10T15:15:00.000Z' }]);
});

test('adds new events and leaves other sources untouched', () => {
  const meetup = { title: 'Pop-up Meetup', date: '2026-10-22T22:00:00.000Z', source: 'meetup', group: '757 Developers' };
  const { events } = select(vevent(EXCEL));

  const result = reconcileNnplEvents([meetup], events, NOW);

  assert.equal(result.length, 2);
  assert.equal(result[0], meetup);
  assert.equal(result[1].featuredEvent, false);
  assert.equal(result[1].createdDate, NOW.toISOString());
  assert.equal(result[1].updatedDate, NOW.toISOString());
});

test('keeps metadata and timestamps when nothing changed', () => {
  const { events } = select(vevent(EXCEL));
  const [stored] = reconcileNnplEvents([], events, new Date('2026-10-01T00:00:00.000Z'));
  stored.featuredEvent = true;

  const result = reconcileNnplEvents([stored], events, NOW);

  assert.deepEqual(result, [stored]);
});

test('updates a series occurrence in place when its time moves', () => {
  const [stored] = reconcileNnplEvents([], select(vevent(EXCEL)).events, new Date('2026-10-01T00:00:00.000Z'));
  const moved = select(vevent({ ...EXCEL, start: '20261015T213000Z', end: '20261015T233000Z' })).events;

  const result = reconcileNnplEvents([stored], moved, NOW);

  assert.equal(result.length, 1);
  assert.equal(result[0].date, '2026-10-15T21:30:00.000Z');
  assert.equal(result[0].createdDate, '2026-10-01T00:00:00.000Z');
  assert.equal(result[0].updatedDate, NOW.toISOString());
  assert.deepEqual(result[0].previousVersion, { title: 'Excel for Beginners', date: '2026-10-14T21:30:00.000Z' });
});

test('keeps a rescheduled one-off as the same event when its UID changes', () => {
  const [stored] = reconcileNnplEvents([], select(vevent(PREMIERE)).events, new Date('2026-10-01T00:00:00.000Z'));
  stored.featuredEvent = true;
  const rescheduled = select(
    vevent({ ...PREMIERE, uid: '4570/29895690/0/0', start: '20261103T223000Z', end: '20261104T003000Z' }),
  ).events;

  const result = reconcileNnplEvents([stored], rescheduled, NOW);

  assert.equal(result.length, 1);
  assert.equal(result[0].sourceId, `${CALENDAR}/4570/29895690/0/0`);
  assert.equal(result[0].createdDate, '2026-10-01T00:00:00.000Z');
  assert.equal(result[0].featuredEvent, true);
  assert.deepEqual(result[0].previousVersion, { title: 'Premiere Pro for Beginners', date: '2026-10-27T21:30:00.000Z' });
});

test('does not treat a new date as a reschedule of an occurrence that already happened', () => {
  const earlier = new Date('2026-10-01T00:00:00.000Z');
  const [stored] = reconcileNnplEvents(
    [],
    selectNnplEvents(parseIcs(feed(vevent({ ...PREMIERE, uid: '4570/29830000/0/0', start: '20261005T213000Z', end: '20261005T233000Z' }))), ALLOWLIST, earlier).events,
    earlier,
  );

  const result = reconcileNnplEvents([stored], select(vevent(PREMIERE)).events, NOW);

  assert.equal(result.length, 1);
  assert.equal(result[0].createdDate, NOW.toISOString());
  assert.equal('previousVersion' in result[0], false);
});

test('removes an upcoming event that is cancelled or leaves the feed', () => {
  const stored = reconcileNnplEvents([], select(vevent(EXCEL), vevent(PREMIERE)).events, NOW);

  const result = reconcileNnplEvents(stored, select(vevent(EXCEL), vevent({ ...PREMIERE, extra: 'STATUS:CANCELLED' })).events, NOW);

  assert.deepEqual(result.map((event) => event.title), ['Excel for Beginners']);
});
