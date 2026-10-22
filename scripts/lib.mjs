// The status page, from files: services.json (what customers see listed) and
// incidents/*.md (one file per incident, updates appended as you post them).
// No dependencies, so it builds anywhere and never depends on SparkLayer's own
// infrastructure. See README.md for how to post an update.

export const LEVELS = {
  ok: {
    rank: 0,
    word: 'Working normally',
    headline: 'Everything is working normally',
  },
  minor: {
    rank: 1,
    word: 'Some issues',
    headline: 'Some services have issues',
  },
  major: {
    rank: 2,
    word: 'Not working',
    headline: 'We’re having an outage',
  },
};
const IMPACT = { minor: 'minor', major: 'major', degraded: 'minor', outage: 'major' };
export const STATES = ['Investigating', 'Identified', 'Update', 'Monitoring', 'Resolved'];

const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

// ── Reading files ────────────────────────────────────────────────────────────

/** "--- key: value ---" front matter (strings, and [a, b] lists), then the body. */
export function parseFrontMatter(text) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: String(text) };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*(#.*)?$/);
    if (!kv) continue;
    let v = kv[2].replace(/^["']|["']$/g, '');
    if (/^\[.*\]$/.test(kv[2]))
      v = kv[2]
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    data[kv[1]] = v;
  }
  return { data, body: m[2] };
}

/** "2026-10-22 09:45", read as UK time (what the team writes), as a Date. */
export function ukTime(s) {
  const m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  // Start from the same wall-clock time in UTC, then correct by London's offset then.
  let t = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date(t));
    const p = Object.fromEntries(parts.map(x => [x.type, Number(x.value)]));
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    t += Date.UTC(y, mo - 1, d, h, mi) - shown;
  }
  return new Date(t);
}

/** The few Markdown bits an update needs: paragraphs, lists, **bold**, *italic*, `code`, links. */
export function md(text) {
  const inline = s =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g,
        '<a href="$2" rel="noopener">$1</a>',
      );
  const out = [];
  for (const block of String(text).trim().split(/\n\s*\n/)) {
    const lines = block.split('\n').map(l => l.trimEnd());
    if (lines.every(l => /^\s*[-*]\s+/.test(l)))
      out.push(`<ul>${lines.map(l => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`);
    else if (lines.join('').trim()) out.push(`<p>${lines.map(inline).join('<br>')}</p>`);
  }
  return out.join('\n');
}

/**
 * One incident file. Front matter: title, impact (minor | major), affects (a
 * list of service ids, or all). The text before the first "## " heading is the
 * summary; each "## 2026-10-22 09:45 · Investigating" section is an update.
 * It's resolved once its newest update is marked Resolved.
 */
export function parseIncident(text, slug, serviceIds) {
  const { data, body } = parseFrontMatter(text);
  const errors = [];
  const title = String(data.title ?? '').trim();
  if (!title) errors.push('missing "title"');
  const impact = IMPACT[String(data.impact ?? '').toLowerCase()];
  if (!impact) errors.push('"impact" must be minor or major');
  let affects = Array.isArray(data.affects) ? data.affects : data.affects ? [data.affects] : [];
  affects = affects.map(a => String(a).toLowerCase());
  if (affects.includes('all')) affects = [...serviceIds];
  for (const a of affects) if (!serviceIds.includes(a)) errors.push(`unknown service "${a}" in affects`);

  const [summary, ...sections] = body.split(/^## /m);
  const updates = sections.map(sec => {
    const [head, ...rest] = sec.split('\n');
    const hm = head.match(/^(.+?)\s*[·|-]\s*([A-Za-z ]+?)\s*$/);
    const at = hm ? ukTime(hm[1]) : null;
    const state = hm ? STATES.find(s => s.toLowerCase() === hm[2].toLowerCase()) : null;
    if (!at) errors.push(`update "## ${head.trim()}" needs a date like 2026-10-22 09:45`);
    if (hm && !state) errors.push(`update "## ${head.trim()}": "${hm[2]}" isn't one of ${STATES.join(', ')}`);
    return { at, state: state ?? 'Update', html: md(rest.join('\n')) };
  });
  updates.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
  if (!updates.length) errors.push('needs at least one "## date · state" update');
  const started = data.started ? ukTime(data.started) : updates.at(-1)?.at ?? null;
  const resolved = updates[0]?.state === 'Resolved';
  return {
    slug,
    title,
    impact: impact ?? 'minor',
    affects,
    summary: md(summary),
    updates,
    started,
    /** Whether "started" was given; otherwise it's only when the first update went out. */
    startedKnown: !!data.started,
    open: !resolved,
    resolvedAt: resolved ? updates[0].at : null,
    errors,
  };
}

/** Each service's level: the worst open incident affecting it. */
export function serviceStatus(services, incidents) {
  const open = incidents.filter(i => i.open);
  return services.map(s => {
    const hits = open.filter(i => i.affects.includes(s.id));
    const level = hits.some(i => i.impact === 'major') ? 'major' : hits.length ? 'minor' : 'ok';
    return { ...s, level, incidents: hits };
  });
}

export function overall(statuses) {
  return statuses.some(s => s.level === 'major')
    ? 'major'
    : statuses.some(s => s.level === 'minor')
      ? 'minor'
      : 'ok';
}

// ── Rendering ────────────────────────────────────────────────────────────────

const UK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});
/** A time, shown in UK time in the HTML and in the reader's own time once the page loads. */
const when = (d, cls = '') =>
  d ? `<time datetime="${d.toISOString()}"${cls ? ` class="${cls}"` : ''}>${esc(UK.format(d))}</time>` : '';
const ago = (from, to) => {
  const m = Math.max(1, Math.round((to - from) / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} hr${h === 1 ? '' : 's'}${m % 60 ? ` ${m % 60} min` : ''}`;
  return `${Math.round(h / 24)} days`;
};

const ICON = {
  ok: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10"/><path d="M5.8 10.3l2.7 2.7 5.7-5.9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  minor: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10"/><path d="M10 5.2v5.6" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/><circle cx="10" cy="14.4" r="1.35" fill="#fff"/></svg>',
  major: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10"/><path d="M6.6 6.6l6.8 6.8M13.4 6.6l-6.8 6.8" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/></svg>',
};
const pill = level => `<span class="pill pill-${level}"><span class="dot"></span>${LEVELS[level].word}</span>`;
const stateTag = s => `<span class="state state-${s.toLowerCase()}">${esc(s)}</span>`;

function page({ title, description, body, root = '' }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${root}styles.css">
</head>
<body>
<div class="bar" aria-hidden="true"></div>
<header class="wrap top">
  <a class="brand" href="${root || './'}"><img src="${root}logo-dark.png" alt="SparkLayer" width="534" height="117"><span>Status</span></a>
  <a class="help" href="https://docs.sparklayer.io/help/support" rel="noopener">Contact support</a>
</header>
<main class="wrap">
${body}
</main>
<footer class="wrap foot">
  <span>© ${new Date().getFullYear()} SparkLayer</span>
  <span>Times are shown in your time zone. <a href="https://www.sparklayer.io" rel="noopener">sparklayer.io</a></span>
</footer>
<script src="${root}local-time.js" defer></script>
</body>
</html>
`;
}

function incidentCard(i, services, now) {
  const latest = i.updates[0];
  const names = i.affects.map(a => services.find(s => s.id === a)?.name).filter(Boolean);
  return `<article class="notice notice-${i.impact}">
  <div class="notice-head">${ICON[i.impact]}<div>
    <h2><a href="incidents/${i.slug}/">${esc(i.title)}</a></h2>
    <p class="notice-meta">${names.length ? `Affects ${esc(names.join(', '))} · ` : ''}${i.startedKnown ? `Started ${when(i.started)} · ${ago(i.started, now)} ago` : `First update ${when(i.started)}`}</p>
  </div></div>
  ${i.summary ? `<div class="notice-body">${i.summary}</div>` : ''}
  <div class="notice-foot">
    ${latest ? `<span class="notice-latest">${stateTag(latest.state)} Latest update ${when(latest.at)}</span>` : ''}
    <a class="notice-cta" href="incidents/${i.slug}/">Read all updates <span aria-hidden="true">→</span></a>
  </div>
</article>`;
}

export function renderHome({ services, incidents, now = new Date(), pastDays = 30 }) {
  const statuses = serviceStatus(services, incidents);
  const level = overall(statuses);
  const open = incidents.filter(i => i.open).sort((a, b) => b.started - a.started);
  const past = incidents
    .filter(i => !i.open && i.resolvedAt && now - i.resolvedAt < pastDays * 86400000)
    .sort((a, b) => b.resolvedAt - a.resolvedAt);
  const lastChange = incidents.flatMap(i => i.updates.map(u => u.at)).filter(Boolean).sort((a, b) => b - a)[0];

  const body = `
<section class="hero hero-${level}">
  ${ICON[level]}
  <div>
    <h1>${LEVELS[level].headline}</h1>
    <p>${
      level === 'ok'
        ? 'All SparkLayer services are running as expected.'
        : 'We know about it and we’re working on it. Updates are posted below as soon as we have them.'
    }${lastChange ? ` Last updated ${when(lastChange)}.` : ''}</p>
  </div>
</section>

${open.length ? `<section class="notices" aria-label="Current incidents">${open.map(i => incidentCard(i, services, now)).join('\n')}</section>` : ''}

<section class="services" aria-label="Services">
  <h2 class="section-title">Services</h2>
  <ul>
${statuses
  .map(
    s => `    <li class="service service-${s.level}">
      <div class="service-text">
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.description)}</p>
        ${s.incidents.length ? `<p class="service-link">${s.incidents.map(i => `<a href="incidents/${i.slug}/">${esc(i.title)}</a>`).join(' · ')}</p>` : ''}
      </div>
      ${pill(s.level)}
    </li>`,
  )
  .join('\n')}
  </ul>
  <p class="legend">${['ok', 'minor', 'major'].map(pill).join('')}</p>
</section>

<section class="past" aria-label="Recent incidents">
  <h2 class="section-title">Recent incidents</h2>
  ${
    past.length
      ? `<ul>${past
          .map(
            i => `<li><a href="incidents/${i.slug}/"><span class="past-title">${esc(i.title)}</span><span class="past-meta">Resolved ${when(i.resolvedAt)}${i.startedKnown ? ` · lasted ${ago(i.started, i.resolvedAt)}` : ''}</span></a></li>`,
          )
          .join('')}</ul>`
      : `<p class="empty">No incidents in the last ${pastDays} days.</p>`
  }
</section>`;
  return page({
    title: level === 'ok' ? 'SparkLayer Status' : `${LEVELS[level].headline} · SparkLayer Status`,
    description: 'Whether SparkLayer’s storefront, Dashboard and API are working, and updates on any incident.',
    body,
  });
}

export function renderIncident(i, { services, now = new Date() }) {
  const names = i.affects.map(a => services.find(s => s.id === a)?.name).filter(Boolean);
  const status = i.open ? i.impact : 'ok';
  const body = `
<p class="crumb"><a href="../../">← All services</a></p>
<article class="incident">
  <header class="incident-head incident-${status}">
    ${ICON[status]}
    <div>
      <p class="incident-kicker">${i.open ? (i.impact === 'major' ? 'Ongoing outage' : 'Ongoing issue') : 'Resolved'}</p>
      <h1>${esc(i.title)}</h1>
      <p class="incident-meta">
        ${names.length ? `Affects <strong>${esc(names.join(', '))}</strong> · ` : ''}${i.startedKnown ? 'Started' : 'First update'} ${when(i.started)}${
          i.open
            ? i.startedKnown
              ? ` · ${ago(i.started, now)} so far`
              : ''
            : ` · Resolved ${when(i.resolvedAt)}${i.startedKnown ? ` · lasted ${ago(i.started, i.resolvedAt)}` : ''}`
        }
      </p>
    </div>
  </header>
  ${i.summary ? `<div class="incident-summary">${i.summary}</div>` : ''}
  <h2 class="section-title">Updates</h2>
  <ol class="timeline">
${i.updates
  .map(
    u => `    <li class="tl tl-${u.state.toLowerCase()}">
      <div class="tl-head">${stateTag(u.state)} ${when(u.at, 'tl-time')}</div>
      <div class="tl-body">${u.html}</div>
    </li>`,
  )
  .join('\n')}
  </ol>
  <p class="incident-foot">We post an update whenever anything changes${i.open ? ', and at least every few hours until it’s fixed' : ''}. Questions? <a href="https://docs.sparklayer.io/help/support" rel="noopener">Contact support</a>.</p>
</article>`;
  return page({
    title: `${i.title} · SparkLayer Status`,
    description: i.open ? `Ongoing: ${i.title}. Updates from SparkLayer.` : `Resolved: ${i.title}.`,
    body,
    root: '../../',
  });
}
