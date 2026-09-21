const lastAt = new Map();

export const USER_AGENT = "book-of-life/1.0 (taxonomy harvest; local static viz)";
const UA = USER_AGENT;

export async function fetchBuffer(url, { timeout = 120000, accept, retries = 5 } = {}) {
  const headers = { "User-Agent": UA };
  if (accept) headers.Accept = accept;
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) });
      if (!res.ok) throw new Error(`${url} → ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastErr = err;
      const wait = Math.min(8000, 400 * attempt * attempt);
      console.warn(`fetch retry ${attempt}/${retries} ${url} (${err.cause?.code || err.message}); wait ${wait}ms`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw lastErr;
}

export async function fetchText(url, opts = {}) {
  return (await fetchBuffer(url, opts)).toString("utf8");
}

export async function fetchJson(url, opts = {}) {
  return JSON.parse(await fetchText(url, { accept: "application/json", ...opts }));
}

export async function downloadTo(url, dest, opts = {}) {
  const { writeFile } = await import("node:fs/promises");
  console.log(`Downloading ${url}`);
  const buf = await fetchBuffer(url, opts);
  await writeFile(dest, buf);
  return dest;
}

export async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rateLimit(host, minInterval = 500) {
  const prev = lastAt.get(host) || 0;
  const wait = minInterval - (Date.now() - prev);
  if (wait > 0) await sleep(wait);
  lastAt.set(host, Date.now());
}
