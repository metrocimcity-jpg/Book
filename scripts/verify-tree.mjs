import puppeteer from "puppeteer";

const base = process.argv[2] || "http://localhost:8080";
const outDir =
  process.argv[3] ||
  "/home/ubuntu/.cursor/projects/workspace/agent-transcripts/media";

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.setViewport({ width: 1920, height: 1200 });
await page.goto(base, { waitUntil: "networkidle2", timeout: 60000 });
await page.waitForSelector("path.link", { timeout: 15000 });

const stats = await page.evaluate(() => ({
  links: document.querySelectorAll("path.link").length,
  nodes: document.querySelectorAll("g.node").length,
  banners: document.querySelectorAll("g.banner").length,
}));

console.log(JSON.stringify({ stats, errors }));

await page.screenshot({
  path: `${outDir}/mammal_tree_overview.png`,
  fullPage: false,
});

await page.evaluate(() => {
  const svg = document.querySelector("svg");
  const zoom = window.d3?.zoomTransform?.(svg);
});
// zoom via wheel simulation - use transform on g
await page.mouse.move(960, 600);
await page.mouse.wheel({ deltaY: -400 });

await page.screenshot({
  path: `${outDir}/mammal_tree_zoomed.png`,
});

await page.evaluate(() => {
  document.querySelector("g.node")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({
  path: `${outDir}/mammal_tree_detail_panel.png`,
});

await browser.close();
