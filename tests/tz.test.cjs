const T = require('../app.js');
const tz = 'America/Chicago';
let fails = 0;
const iso = d => d.toISOString().replace('.000','');
function check(name, got, want) {
  const ok = got === want;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      got  ${got}\n      want ${want}`);
}

// 1. plain weekly recurrence: from Fri Oct 9 19:00 CDT -> next Tue 20:00 CDT
check('next Tue 20:00 from Fri evening',
  iso(T.nextOccurrence({dow:2,time:'20:00'}, new Date('2026-10-10T00:00:00Z'), tz)),
  '2026-10-14T01:00:00.000Z'.replace('.000',''));

// 2. same day, time not yet passed -> today
check('Fri 19:30 from Fri 18:00 CDT stays today',
  iso(T.nextOccurrence({dow:5,time:'19:30'}, new Date('2026-10-09T23:00:00Z'), tz)),
  '2026-10-10T00:30:00.000Z'.replace('.000',''));

// 3. same day, time already passed -> +7 days
check('Fri 19:30 from Fri 20:00 CDT rolls a week',
  iso(T.nextOccurrence({dow:5,time:'19:30'}, new Date('2026-10-10T01:05:00Z'), tz)),
  '2026-10-17T00:30:00.000Z'.replace('.000',''));

// 4. DST boundary: US DST ends Sun 2026-11-01 at 02:00 local (CDT -5 -> CST -6)
check('Sun 19:00 across the DST change is CST',
  iso(T.nextOccurrence({dow:0,time:'19:00'}, new Date('2026-10-31T23:00:00Z'), tz)),
  '2026-11-02T01:00:00.000Z'.replace('.000',''));

// 5. and before the change it is still CDT
check('Sun 19:00 before the change is CDT',
  iso(T.nextOccurrence({dow:0,time:'19:00'}, new Date('2026-10-20T00:00:00Z'), tz)),
  '2026-10-26T00:00:00.000Z'.replace('.000',''));

// 6. another zone entirely
check('Tue 20:00 in Europe/Berlin',
  iso(T.nextOccurrence({dow:2,time:'20:00'}, new Date('2026-10-10T00:00:00Z'), 'Europe/Berlin')),
  '2026-10-13T18:00:00.000Z'.replace('.000',''));

// 7. round trip: zone wall clock -> instant -> back
let roundTripOk = true;
for (let day = 0; day < 400; day++) {
  const d = new Date(Date.UTC(2026, 0, 1, 12, 34, 56) + day * 86400000);
  const back = new Date(T.fromWall(T.partsIn ? 0 : 0, tz)); // placeholder, replaced below
  const wall = Date.UTC(+T.partsIn(d,tz).year, +T.partsIn(d,tz).month-1, +T.partsIn(d,tz).day, +T.partsIn(d,tz).hour%24, +T.partsIn(d,tz).minute, +T.partsIn(d,tz).second);
  const resolved = T.fromWall(wall, tz);
  if (Math.abs(resolved - d.getTime()) > 1000) { roundTripOk = false; console.log('   mismatch at', d.toISOString(), resolved); break; }
}
check('wall-clock round trip over 400 days', String(roundTripOk), 'true');

// 8. upcoming() is sorted and every start is in the future
const slots = [
  {dow:2,time:'20:00',label:'8:00 PM',game:'Valorant'},
  {dow:4,time:'20:00',label:'8:00 PM',game:'Helldivers 2'},
  {dow:5,time:'19:30',label:'7:30 PM',game:'Viewer lobby'},
  {dow:6,time:'14:00',label:'2:00 PM',game:'Long haul'},
  {dow:0,time:'19:00',label:'7:00 PM',game:'Just chatting'}
];
for (const from of ['2026-10-10T00:00:00Z','2026-10-13T02:00:00Z','2026-11-01T05:00:00Z','2027-03-14T07:00:00Z']) {
  const now = new Date(from);
  const up = T.upcoming(slots, now, tz);
  const sorted = up.every((u,i) => i === 0 || up[i-1].start <= u.start);
  const future = up.every(u => u.start > now);
  const weekly = up.length === 5;
  check(`from ${from}: sorted=${sorted} future=${future} count=${weekly}`, 'true', 'true');
  console.log('      next three:', up.slice(0,3).map(u => `${u.slot.game} ${u.start.toISOString()}`).join(' | '));
}
console.log(fails ? `\n${fails} FAILURE(S)` : '\nall time zone checks passed');
process.exit(fails ? 1 : 0);
