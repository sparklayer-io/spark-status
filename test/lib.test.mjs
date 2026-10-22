import assert from 'node:assert/strict';
import test from 'node:test';
import { md, overall, parseIncident, previewText, serviceStatus, ukTime } from '../scripts/lib.mjs';

const services = [
  { id: 'frontend', name: 'SparkLayer Frontend', description: '' },
  { id: 'dashboard', name: 'SparkLayer Dashboard', description: '' },
  { id: 'api', name: 'SparkLayer API', description: '' },
];
const ids = services.map(s => s.id);
const file = (front, updates) => `---\n${front}\n---\nSummary.\n\n${updates}`;

test('UK times read as UK time, summer and winter', () => {
  assert.equal(ukTime('2026-10-22 09:45').toISOString(), '2026-10-22T08:45:00.000Z'); // BST
  assert.equal(ukTime('2026-12-01 09:45').toISOString(), '2026-12-01T09:45:00.000Z'); // GMT
  assert.equal(ukTime('22/10/2026 09:45'), null);
});

test('an incident: updates sorted newest first, open until Resolved', () => {
  const i = parseIncident(
    file('title: Down\nimpact: major\naffects: [all]', '## 2026-10-22 02:27 · Identified\nOne.\n\n## 2026-10-22 06:53 · Monitoring\nTwo.'),
    'x',
    ids,
  );
  assert.deepEqual(i.errors, []);
  assert.deepEqual(i.affects, ids);
  assert.equal(i.updates[0].state, 'Monitoring');
  assert.equal(i.open, true);
  assert.equal(i.startedKnown, false);
  const done = parseIncident(
    file('title: Down\nimpact: major\naffects: [api]\nstarted: 2026-10-22 01:00', '## 2026-10-22 02:27 · Investigating\nA.\n\n## 2026-10-22 09:00 · Resolved\nFixed.'),
    'y',
    ids,
  );
  assert.equal(done.open, false);
  assert.equal(done.resolvedAt.toISOString(), '2026-10-22T08:00:00.000Z');
  assert.equal(done.started.toISOString(), '2026-10-22T00:00:00.000Z');
});

test('mistakes are named, so the build stops instead of publishing them', () => {
  const i = parseIncident(file('impact: severe\naffects: [shop]', '## yesterday · Fixed\nHmm.'), 'z', ids);
  assert.ok(i.errors.some(e => e.includes('title')));
  assert.ok(i.errors.some(e => e.includes('impact')));
  assert.ok(i.errors.some(e => e.includes('unknown service "shop"')));
  assert.ok(i.errors.some(e => e.includes('needs a date')));
});

test('each service takes the worst open incident affecting it', () => {
  const minor = parseIncident(file('title: Slow\nimpact: minor\naffects: [frontend, api]', '## 2026-10-22 09:00 · Investigating\nA.'), 'a', ids);
  const major = parseIncident(file('title: Down\nimpact: major\naffects: [api]', '## 2026-10-22 09:00 · Investigating\nB.'), 'b', ids);
  const over = parseIncident(file('title: Old\nimpact: major\naffects: [dashboard]', '## 2026-10-22 09:00 · Resolved\nC.'), 'c', ids);
  const s = serviceStatus(services, [minor, major, over]);
  assert.deepEqual(s.map(x => x.level), ['minor', 'ok', 'major']);
  assert.equal(overall(s), 'major');
  assert.equal(overall(serviceStatus(services, [over])), 'ok');
});

test('a service can have its own level in affects', () => {
  const i = parseIncident(file('title: Down\nimpact: major\naffects: [frontend, dashboard, api: minor]', '## 2026-10-22 09:00 · Identified\nA.'), 'd', ids);
  assert.deepEqual(i.errors, []);
  assert.deepEqual(serviceStatus(services, [i]).map(x => x.level), ['major', 'major', 'minor']);
  const all = parseIncident(file('title: Down\nimpact: major\naffects: [all, api: minor]', '## 2026-10-22 09:00 · Identified\nA.'), 'e', ids);
  assert.deepEqual(serviceStatus(services, [all]).map(x => x.level), ['major', 'major', 'minor']);
  const bad = parseIncident(file('title: Down\nimpact: major\naffects: [api: sideways]', '## 2026-10-22 09:00 · Identified\nA.'), 'f', ids);
  assert.ok(bad.errors.some(e => e.includes('minor or major')));
});

test('update text: escaped, with bold, lists and safe links only', () => {
  const h = md('**Next update:** soon <script>\n\n- one\n- two\n\n[NCSC](https://www.ncsc.gov.uk) [bad](javascript:alert(1))');
  assert.match(h, /<strong>Next update:<\/strong> soon &lt;script&gt;/);
  assert.match(h, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(h, /<a href="https:\/\/www.ncsc.gov.uk" target="_blank" rel="noopener noreferrer">NCSC<\/a>/);
  assert.doesNotMatch(h, /href="javascript/);
});

test('link previews use whole sentences of the summary, as plain text', () => {
  const html = md('SparkLayer is offline. A [critical issue](https://x.io) affects **many** sites, and we’ve kept our services offline until a fix is verified. We’ve found no evidence your data was affected.');
  const t = previewText(html);
  assert.ok(t.length <= 300);
  assert.ok(t.startsWith('SparkLayer is offline. A critical issue affects many sites'));
  assert.ok(t.endsWith('.'));
  assert.doesNotMatch(t, /<|\*\*/);
});
