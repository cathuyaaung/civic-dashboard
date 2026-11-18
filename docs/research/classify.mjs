// Re-classify declaration sections from the saved minutes text, handling the
// "DECLARATION OF CONFLICT OF INTEREST - Nil" same-line form, and summarise votes.
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2];
const index = JSON.parse(fs.readFileSync(path.join(DIR, 'minutes-index.json'), 'utf8'));

const NIL = /^(nil|none|no\b.*(declar|conflict)|there were no|there was no)/i;

const rows = [];
for (const m of index) {
  const file = path.join(DIR, 'minutes', `${m.date}_${m.meetingId.slice(0, 8)}.txt`);
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const i = lines.findIndex((l) => /DECLARATIONS? OF CONFLICTS? OF INTEREST|DECLARATIONS? OF (PECUNIARY )?INTEREST/i.test(l));
  if (i < 0) {
    rows.push({ ...m, found: false });
    continue;
  }
  // Same-line remainder after the heading, else the following lines.
  const headline = lines[i].replace(/.*DECLARATIONS? OF (CONFLICTS? OF )?(PECUNIARY )?INTEREST/i, '').replace(/^[\s\-–—:.]+/, '').trim();
  const body = [headline];
  for (let j = i + 1; j < lines.length && body.join(' ').length < 600; j++) {
    const l = lines[j];
    if (/^\d+(\.\d+)*\.?$/.test(l)) break;
    if (/^(MINUTES OF PREVIOUS|PRESENTATIONS|DEPUTATIONS|PUBLIC QUESTION|APPROVAL OF|MATTERS CONSIDERED)/i.test(l)) break;
    body.push(l);
  }
  const raw = body.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  rows.push({ ...m, found: true, raw, nil: raw === '' || NIL.test(raw) });
}

const found = rows.filter((r) => r.found);
const real = found.filter((r) => !r.nil);

console.log(`meetings with minutes:            ${rows.length}`);
console.log(`with a declaration agenda item:   ${found.length}`);
console.log(`  recorded as nil / none:         ${found.length - real.length}`);
console.log(`  an actual declaration:          ${real.length}`);
console.log('\n=== ACTUAL DECLARATIONS ===\n');
for (const r of real) {
  console.log(`${r.date}  ${r.meeting}`);
  console.log(`   ${r.raw.slice(0, 500)}`);
  console.log(`   ${r.url}\n`);
}

// ---- votes
const votes = JSON.parse(fs.readFileSync(path.join(DIR, 'votes.json'), 'utf8'));
const labels = new Map();
for (const v of votes) for (const k of Object.keys(v.sides)) labels.set(k, (labels.get(k) || 0) + 1);
console.log('=== vote tally labels seen ===');
for (const [k, n] of [...labels].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);

const dissent = votes.filter((v) => (v.sides.NO?.count || 0) > 0);
const abstain = votes.filter((v) => (v.sides.ABSTAIN?.count || 0) > 0);
const conflict = votes.filter((v) => (v.sides.CONFLICT?.count || 0) > 0);
console.log(`\nrecorded votes:        ${votes.length}`);
console.log(`  with any NO:         ${dissent.length}`);
console.log(`  with any ABSTAIN:    ${abstain.length}`);
console.log(`  with any CONFLICT:   ${conflict.length}`);

// per-member participation
const tally = new Map();
for (const v of votes)
  for (const [side, s] of Object.entries(v.sides))
    for (const name of s.members) {
      const key = name.replace(/\s+/g, ' ').trim();
      if (!tally.has(key)) tally.set(key, {});
      tally.get(key)[side] = (tally.get(key)[side] || 0) + 1;
    }
console.log('\n=== per-member recorded-vote counts (top 20 by total) ===');
const sorted = [...tally]
  .map(([k, v]) => [k, v, Object.values(v).reduce((a, b) => a + b, 0)])
  .sort((a, b) => b[2] - a[2]);
for (const [name, sides, total] of sorted.slice(0, 20))
  console.log(`  ${String(total).padStart(4)}  ${name.padEnd(46)} ${JSON.stringify(sides)}`);
console.log(`\ndistinct member strings: ${tally.size}`);

console.log('\n=== ABSTAIN / CONFLICT votes in full ===');
for (const v of [...abstain, ...conflict]) {
  console.log(`${v.date}  ${v.meeting}`);
  console.log(`   subject: ${(v.subject || '').slice(0, 220)}`);
  for (const [side, s] of Object.entries(v.sides))
    console.log(`   ${side} (${s.count}): ${s.members.join('; ') || '-'}`);
  console.log();
}

fs.writeFileSync(path.join(DIR, 'declarations-classified.json'), JSON.stringify(rows, null, 2));
