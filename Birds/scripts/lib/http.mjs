const lastAt = new Map();

export const USER_AGENT =
  "birds-sunburst/1.0 (+https://www.avilist.org/; local educational viz)";

export async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rateLimit(host, minInterval = 500) {
  const prev = lastAt.get(host) || 0;
  const wait = minInterval - (Date.now() - prev);
  if (wait > 0) await sleep(wait);
  lastAt.set(host, Date.now());
}

export async function fetchOk(url, { headers = {}, retries = 4 } = {}) {
  const host = new URL(url).host;
  let attempt = 0;
  while (true) {
    await rateLimit(host, 500);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, ...headers },
        signal: AbortSignal.timeout(30000)
      });
      if (res.ok) return res;
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const backoff = 2 ** attempt * 750;
        console.warn(`retry ${res.status} ${url} in ${backoff}ms`);
        await sleep(backoff);
        attempt += 1;
        continue;
      }
      const err = new Error(`${res.status} ${url}`);
      err.status = res.status;
      throw err;
    } catch (err) {
      if (err.status) throw err;
      if (attempt < retries) {
        const backoff = 2 ** attempt * 750;
        console.warn(`retry ${err.cause?.code || err.message} ${url} in ${backoff}ms`);
        await sleep(backoff);
        attempt += 1;
        continue;
      }
      throw err;
    }
  }
}

export async function fetchJson(url, headers = {}) {
  const res = await fetchOk(url, { headers: { Accept: "application/json", ...headers } });
  return res.json();
}

export async function fetchBuffer(url, headers = {}) {
  const res = await fetchOk(url, { headers });
  return Buffer.from(await res.arrayBuffer());
}
