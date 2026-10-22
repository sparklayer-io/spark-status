# SparkLayer Status

The status page for SparkLayer customers: whether the **Frontend**, **Dashboard**
and **API** are working, and updates on any incident. Everything is manual and
lives in this repo; there's no database and nothing to log in to.

- **Green, "Working normally"**: no open incident affects it.
- **Amber, "Some issues"**: an open incident with `impact: minor` affects it.
- **Red, "Not working"**: an open incident with `impact: major` affects it.

The site is self-contained (logo, styles and scripts are all in this repo), so it
keeps working when SparkLayer doesn't.

## Post an update (the usual job)

You can do all of this on github.com: open the file, press the pencil icon, edit,
then **Commit changes** to `main`. The page is live again within a minute.

1. Open the incident's file in `incidents/` (e.g. `incidents/2026-10-22-php-security-issue.md`).
2. Add a new section anywhere below the summary, headed with the **UK** date and
   time and a state:

   ```markdown
   ## 2026-10-22 11:55 · Monitoring
   SparkLayer is back online on the patched infrastructure. We're watching it closely.
   ```

   States: `Investigating`, `Identified`, `Update`, `Monitoring`, `Resolved`.
3. Keep the summary at the top (the text before the first `##`) current: it's what
   the home page shows, including when the next update is due.

## Close an incident

Add a final section marked `Resolved`. The services go back to green and the
incident moves to "Recent incidents" (shown for 30 days):

```markdown
## 2026-10-22 13:10 · Resolved
Everything is working normally again. Thank you for your patience.
```

## Start a new incident

Copy `incidents/_template.md` to `incidents/YYYY-MM-DD-short-name.md` (the name
becomes its web address) and fill it in:

```markdown
---
title: Checkout is slow for some stores
impact: minor              # minor = amber, major = red
affects: [frontend]        # frontend, dashboard, api, or all; give one its own
                           # level with e.g. [frontend, dashboard, api: minor]
started: 2026-10-22 09:30  # optional, UK time; otherwise "First update" is shown
---
What customers will notice, in a sentence or two.

## 2026-10-22 09:45 · Investigating
What we know so far.
```

Updates support **bold**, *italic*, `- bullet lists` and `[links](https://…)`.
If a file isn't right (a missing title, a date in the wrong shape, an unknown
service), the build stops and says what to fix, and the live page stays as it was.

## Run it locally

```bash
npm run dev     # http://localhost:8099, rebuilds when you save
npm run build   # writes dist/
npm test
```

Node 20+, no dependencies. `services.json` holds the three services' names and
descriptions. The build also writes `dist/status.json` (overall status, each
service, open incidents) for other tools to read.

## Hosting

Vercel, static: `vercel.json` builds with `node scripts/build.mjs` into `dist/`,
from `main` only, with no caching so updates show straight away.
