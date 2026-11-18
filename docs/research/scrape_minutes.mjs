// Pull every 2026 Mississauga meeting that has posted minutes, and extract
// (a) the DECLARATION OF CONFLICT OF INTEREST section, (b) every recorded vote
// with the named members on each side.
//
// Writes minutes-index.json, declarations.json, votes.json into OUT.
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://pub-mississauga.escribemeetings.com';
const OUT = process.argv[2];
if (!OUT) throw new Error('usage: node scrape_minutes.mjs <outdir>');
fs.mkdirSync(path.join(OUT, 'minutes'), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function calendar(from, to) {
  const res = await fetch(`${BASE}/MeetingsCalendarView.aspx/GetCalendarMeetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ calendarStartDate: from, calendarEndDate: to }),
  });
  if (!res.ok) throw new Error(`calendar ${res.status}`);
  return (await res.json()).d;
}

function toText(html) {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  let t = h
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  t = t
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#3[89];|&#8217;/g, "'")
    .replace(/&quot;|&#8220;|&#8221;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#58;/g, ':');
  return t
    .split('\n')
    .map((s) => s.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

// "Councillor S. Dasko, Deputy Mayor and Councillor J. Kovac , and Councillor N. Hart"
function splitMembers(line) {
  return line
    .split(/,\s*(?:and\s+)?|\s+and\s+(?=Councillor|Deputy|Mayor)/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => /councillor|mayor/i.test(s))
    .map((s) => s.replace(/\s+,/g, ','));
}

const TALLY = /^(YES|NO|ABSTAIN|ABSENT|CONFLICT|YEAS?|NAYS?)\s*\((\d+)\)$/i;

function parse(text, meta) {
  const lines = text.split('\n');

  // --- declarations: the standing agenda item, through to the next numbered item
  let declaration = null;
  const di = lines.findIndex((l) => /^DECLARATIONS? OF CONFLICTS? OF INTEREST/i.test(l));
  if (di >= 0) {
    const body = [];
    for (let i = di + 1; i < lines.length && body.length < 25; i++) {
      const l = lines[i];
      if (/^\d+(\.\d+)?\.?$/.test(l)) break; // next agenda item number
      if (/^(MINUTES OF PREVIOUS|PRESENTATIONS|DEPUTATIONS|PUBLIC QUESTION|APPROVAL OF)/i.test(l))
        break;
      body.push(l);
    }
    const joined = body.join(' ').trim();
    declaration = {
      ...meta,
      raw: joined,
      nil: /^(nil|none)\b/i.test(joined),
    };
  }

  // --- recorded votes: a tally line, the member line(s) after it, repeated,
  //     terminated by a Carried/Lost/Defeated line.
  const votes = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(TALLY);
    if (!m) continue;
    // Walk back for the motion text: nearest non-numeric line above.
    let subject = '';
    for (let j = i - 1; j >= 0 && j > i - 12; j--) {
      const l = lines[j];
      if (TALLY.test(l)) continue;
      if (/^(Carried|Lost|Defeated)/i.test(l)) continue;
      if (/councillor|mayor/i.test(l) && l.length > 60) continue; // a member list
      if (l.length > 25) {
        subject = l;
        break;
      }
    }
    const sides = {};
    let outcome = null;
    let j = i;
    while (j < lines.length) {
      const tm = lines[j].match(TALLY);
      if (tm) {
        const label = tm[1].toUpperCase().replace(/S$/, '');
        const names = [];
        let k = j + 1;
        while (k < lines.length && !TALLY.test(lines[k]) && !/^(Carried|Lost|Defeated)/i.test(lines[k])) {
          if (/councillor|mayor/i.test(lines[k])) names.push(...splitMembers(lines[k]));
          else if (names.length) break;
          k++;
        }
        sides[label] = { count: Number(tm[2]), members: names };
        j = k;
        continue;
      }
      const om = lines[j].match(/^(Carried|Lost|Defeated)\s*(\(([\d]+)\s*to\s*([\d]+)\))?/i);
      if (om) {
        outcome = { result: om[1], for: om[3] ? Number(om[3]) : null, against: om[4] ? Number(om[4]) : null };
        j++;
      }
      break;
    }
    if (Object.keys(sides).length) {
      votes.push({ ...meta, subject, sides, outcome });
      i = j - 1;
    }
  }

  return { declaration, votes };
}

const cal = await calendar('2026-01-01', '2026-11-17');
const withMinutes = cal
  .map((m) => {
    const link = (m.MeetingDocumentLink || []).find(
      (d) => d.Type === 'PostMinutes' && d.Format === 'HTML',
    );
    return link
      ? {
          id: String(m.ID),
          name: String(m.MeetingName || '').trim(),
          start: String(m.StartDate).replace(/\//g, '-').replace(' ', 'T'),
          url: new URL(link.Url, `${BASE}/`).href,
        }
      : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.start.localeCompare(b.start));

console.log(`meetings with posted minutes: ${withMinutes.length}`);

const declarations = [];
const votes = [];
const index = [];

for (const [n, m] of withMinutes.entries()) {
  const file = path.join(OUT, 'minutes', `${m.start.slice(0, 10)}_${m.id.slice(0, 8)}.txt`);
  let text;
  if (fs.existsSync(file)) {
    text = fs.readFileSync(file, 'utf8');
  } else {
    const res = await fetch(m.url);
    if (!res.ok) {
      console.log(`  !! ${m.start} ${m.name} -> HTTP ${res.status}`);
      continue;
    }
    text = toText(await res.text());
    fs.writeFileSync(file, text);
    await sleep(400);
  }
  const meta = { meetingId: m.id, meeting: m.name, date: m.start.slice(0, 10), url: m.url };
  const got = parse(text, meta);
  if (got.declaration) declarations.push(got.declaration);
  votes.push(...got.votes);
  index.push({ ...meta, chars: text.length, hasDeclarationItem: !!got.declaration, votes: got.votes.length });
  if ((n + 1) % 20 === 0) console.log(`  ${n + 1}/${withMinutes.length}`);
}

fs.writeFileSync(path.join(OUT, 'minutes-index.json'), JSON.stringify(index, null, 2));
fs.writeFileSync(path.join(OUT, 'declarations.json'), JSON.stringify(declarations, null, 2));
fs.writeFileSync(path.join(OUT, 'votes.json'), JSON.stringify(votes, null, 2));

const nonNil = declarations.filter((d) => !d.nil);
console.log(`\ndeclaration sections found: ${declarations.length}`);
console.log(`  nil:     ${declarations.length - nonNil.length}`);
console.log(`  non-nil: ${nonNil.length}`);
console.log(`recorded votes: ${votes.length}`);
