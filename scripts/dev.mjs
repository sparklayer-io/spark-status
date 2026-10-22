// Local preview: builds, serves dist/ on http://localhost:8099 and rebuilds
// whenever you save an incident, services.json or a style.
import { createReadStream, existsSync, statSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const port = Number(process.env.PORT) || 8099;
// A fresh process each time, so edits to the build scripts apply too.
const rebuild = () => {
  try {
    const out = execFileSync(process.execPath, [join(root, 'scripts/build.mjs')], { encoding: 'utf8', stdio: 'pipe' });
    console.log(`${new Date().toLocaleTimeString()} ${out.trim()}`);
  } catch (e) {
    console.error(`${new Date().toLocaleTimeString()} ${String(e.stderr || e.message).trim()}`);
  }
};
rebuild();
let t;
for (const p of ['incidents', 'public', 'scripts', 'services.json'])
  watch(join(root, p), { recursive: true }, () => {
    clearTimeout(t);
    t = setTimeout(rebuild, 150);
  });
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
createServer((req, res) => {
  let p = join(root, 'dist', decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': types[extname(p)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(p).pipe(res);
}).listen(port, () => console.log(`Status page on http://localhost:${port}`));
