// Builds the status page into dist/: index.html, a page per incident, the
// assets, and status.json (the same status, for other tools to read).
// Fails, naming the file and the problem, if an incident file isn't right, so
// a typo can't publish a broken page (Vercel keeps the last good one).
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  overall,
  parseIncident,
  render404,
  renderFeed,
  renderHome,
  renderIncident,
  renderLlms,
  renderRobots,
  renderSitemap,
  serviceStatus,
} from './lib.mjs';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'dist');

export function build({ now = new Date() } = {}) {
  const services = JSON.parse(readFileSync(join(root, 'services.json'), 'utf8'));
  const ids = services.map(s => s.id);
  const files = readdirSync(join(root, 'incidents')).filter(f => f.endsWith('.md') && !f.startsWith('_'));
  const incidents = files.map(f => parseIncident(readFileSync(join(root, 'incidents', f), 'utf8'), f.replace(/\.md$/, ''), ids));
  const problems = incidents.flatMap(i => i.errors.map(e => `incidents/${i.slug}.md: ${e}`));
  if (problems.length) throw new Error(`Fix these before publishing:\n  ${problems.join('\n  ')}`);

  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(root, 'public'), out, { recursive: true });
  writeFileSync(join(out, 'index.html'), renderHome({ services, incidents, now }));
  for (const i of incidents) {
    mkdirSync(join(out, 'incidents', i.slug), { recursive: true });
    writeFileSync(join(out, 'incidents', i.slug, 'index.html'), renderIncident(i, { services, now }));
  }
  writeFileSync(join(out, '404.html'), render404());
  writeFileSync(join(out, 'robots.txt'), renderRobots());
  writeFileSync(join(out, 'sitemap.xml'), renderSitemap({ incidents, now }));
  writeFileSync(join(out, 'feed.xml'), renderFeed({ incidents, now }));
  writeFileSync(join(out, 'llms.txt'), renderLlms({ services, incidents, now }));
  const statuses = serviceStatus(services, incidents);
  writeFileSync(
    join(out, 'status.json'),
    JSON.stringify(
      {
        status: overall(statuses),
        updated: now.toISOString(),
        services: statuses.map(s => ({ id: s.id, name: s.name, status: s.level })),
        incidents: incidents
          .filter(i => i.open)
          .map(i => ({ id: i.slug, title: i.title, impact: i.impact, affects: i.affects, started: i.started, latest: i.updates[0]?.state })),
      },
      null,
      2,
    ),
  );
  return { incidents: incidents.length, open: incidents.filter(i => i.open).length, status: overall(statuses) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const r = build();
    console.log(`Built dist/: ${r.status} · ${r.open} open of ${r.incidents} incident${r.incidents === 1 ? '' : 's'}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
