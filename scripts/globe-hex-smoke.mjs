import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const shot = process.argv[3] || "/workspace/screenshots/globe-hex-v2.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);

const fullBtn = page.getByRole("button", { name: /^full$/i });
if (await fullBtn.count()) {
  await fullBtn.click();
  await page.waitForTimeout(2000);
}

const globeBtn = page.getByRole("button", { name: /3D Globe/i });
if (await globeBtn.count()) {
  await globeBtn.click();
  await page.waitForTimeout(4000);
}

const row = page.locator("label").filter({ hasText: /GEOFON/i });
if (await row.count()) {
  const cb = row.locator("input[type=checkbox]");
  if (await cb.count()) {
    if (!(await cb.isChecked())) await cb.check();
    await page.waitForTimeout(2500);
  }
}

const tune = page.getByRole("button", { name: /^Tune$/i });
if (await tune.count()) {
  await tune.click();
  await page.waitForTimeout(500);
}

const maxMag = await page.getByText(/Max magnitude/i).count();
const spinOn = await page.getByRole("button", { name: /Spin ON|Spin OFF/i }).count();
const tunePanel = await page.getByText(/Globe tune/i).count();
const hexSize = await page.getByText(/Hex size/i).count();
const stemH = await page.getByText(/Stem height/i).count();

await page.screenshot({ path: shot, fullPage: false });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await page.screenshot({ path: "/workspace/screenshots/globe-hex-mobile.png", fullPage: false });

const body = await page.locator("body").innerText();
console.log(JSON.stringify({
  errors: errors.slice(0, 12),
  maxMag,
  spinOn,
  tunePanel,
  hexSize,
  stemH,
  bodyHasMax: /Max magnitude/i.test(body),
  bodyHasGeofon: /GEOFON/i.test(body),
  canvas: await page.locator("canvas").count(),
  title: await page.title(),
}, null, 2));

await browser.close();
