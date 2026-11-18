// Re-split and normalise member names in the scraped recorded votes, then
// report per-member tallies that reconcile against each vote's stated counts.
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2];
const votes = JSON.parse(fs.readFileSync(path.join(DIR, 'votes.json'), 'utf8'));
const lines = (f) => fs.readFileSync(f, 'utf8');

// Canonical roster, from the ward dataset + the minutes themselves.
const SURNAMES = [
  'Dasko', 'Tedjo', 'Fonseca', 'Kovac', 'Hart', 'Horneck',
  'Damerla', 'Mahoney', 'Reid', 'McFadden', 'Butt', 'Parrish',
];

// A member line is free text; pull surnames out of it directly. This avoids the
// "Deputy Mayor and Councillor J. Kovac" split problem entirely.
function membersFrom(text) {
  const found = [];
  for (const s of SURNAMES) {
    const re = new RegExp(`\\b${s}\\b`, 'g');
    const n = (text.match(re) || []).length;
    for (let i = 0; i < n; i++) found.push(s);
  }
  return [...new Set(found)];
}

const SIDE = (k) => (k === 'YE' ? 'YES' : k);

const tally = new Map();
for (const s of SURNAMES) tally.set(s, { YES: 0, NO: 0, ABSTAIN: 0, ABSENT: 0 });

let reconciled = 0;
let mismatched = 0;
const problems = [];

for (const v of votes) {
  for (const [rawSide, s] of Object.entries(v.sides)) {
    const side = SIDE(rawSide);
    const names = membersFrom(s.members.join(' ; '));
    if (names.length === s.count) reconciled++;
    else {
      mismatched++;
      if (problems.length < 6)
        problems.push({ date: v.date, side, stated: s.count, parsed: names.length, names });
    }
    for (const n of names) if (tally.has(n)) tally.get(n)[side]++;
  }
}

console.log(`recorded votes:               ${votes.length}`);
console.log(`side-blocks reconciling:      ${reconciled}`);
console.log(`side-blocks NOT reconciling:  ${mismatched}`);
if (problems.length) {
  console.log('\nsample mismatches:');
  for (const p of problems) console.log(`  ${p.date} ${p.side} stated=${p.stated} parsed=${p.parsed} -> ${p.names.join(',')}`);
}

console.log('\n=== per-member recorded votes, 2026 (normalised by surname) ===');
console.log('  member        YES    NO  ABST  ABSENT   total   %YES of cast');
const rows = [...tally]
  .map(([n, t]) => {
    const cast = t.YES + t.NO + t.ABSTAIN;
    return { n, ...t, total: cast + t.ABSENT, cast, pct: cast ? (100 * t.YES) / cast : null };
  })
  .sort((a, b) => b.total - a.total);
for (const r of rows)
  console.log(
    `  ${r.n.padEnd(12)}${String(r.YES).padStart(5)}${String(r.NO).padStart(6)}${String(r.ABSTAIN).padStart(6)}${String(r.ABSENT).padStart(8)}${String(r.total).padStart(8)}   ${r.pct === null ? '-' : r.pct.toFixed(1) + '%'}`,
  );

fs.writeFileSync(
  path.join(DIR, 'member-votes-2026.json'),
  JSON.stringify({ note: 'Derived from eSCRIBE posted minutes, 2026-01-01..2026-11-17. Surname-normalised. Unverified against official records.', rows }, null, 2),
);

// Dissent detail: every vote that was not unanimous
const split = votes.filter((v) => (v.sides.NO?.count || 0) + (v.sides.ABSTAIN?.count || 0) > 0);
console.log(`\nnon-unanimous recorded votes: ${split.length} of ${votes.length} (${((100 * split.length) / votes.length).toFixed(1)}%)`);
fs.writeFileSync(path.join(DIR, 'split-votes-2026.json'), JSON.stringify(split, null, 2));
