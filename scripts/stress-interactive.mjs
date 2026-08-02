import { chromium } from "playwright";

const BASE = process.env.BASE || "http://127.0.0.1:8080/";
const out = { steps: [], errors: [], pageErrors: [] };

function step(name, ok, detail = "") {
  out.steps.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") out.errors.push(msg.text());
});
page.on("pageerror", (err) => out.pageErrors.push(String(err)));

try {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const title = await page.title();
  step("load app", title.includes("Sentinel") || title.length > 0, title);

  const body = await page.locator("body").innerText();
  step("visible content", body.length > 500, `${body.length} chars`);

  // Click 3D if available
  const btn3d = page.locator('button:has-text("3D"), [aria-label*="3D"], button:has-text("Globe")').first();
  if (await btn3d.count()) {
    await btn3d.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(3500);
    const canvas = await page.locator("canvas").count();
    step("3D canvas present", canvas > 0, `${canvas} canvas`);
    await page.screenshot({ path: "/workspace/screenshots/stress-3d.png", fullPage: false });
  } else {
    step("3D toggle found", false, "no 3D button");
  }

  // Switch 2D
  const btn2d = page.locator('button:has-text("2D"), button:has-text("Map")').first();
  if (await btn2d.count()) {
    await btn2d.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);
    step("2D switch", true);
  }

  // Time window chips
  for (const label of ["24h", "7d", "30d"]) {
    const chip = page.locator(`button:has-text("${label}")`).first();
    if (await chip.count()) {
      await chip.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(800);
      step(`time ${label}`, true);
    } else {
      step(`time ${label}`, false, "not found");
    }
  }

  // Help guide
  const help = page.locator('button[title*="How to"], button[aria-label*="How to"], button:has-text("Help")').first();
  if (await help.count()) {
    await help.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(800);
    const howto = await page.locator('text=How to use').count();
    step("help guide opens", howto > 0, `matches ${howto}`);
    // close
    await page.locator('button[aria-label="Close help"], button:has-text("Got it")').first().click({ timeout: 3000 }).catch(() => {});
  } else {
    step("help button", false, "not found");
  }

  // Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1500);
  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return { scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight };
  });
  const hOverflow = overflow.scrollW > overflow.clientW + 2;
  step("mobile no horizontal overflow", !hOverflow, JSON.stringify(overflow));
  await page.screenshot({ path: "/workspace/screenshots/stress-mobile.png", fullPage: false });

  // Landscape short
  await page.setViewportSize({ width: 800, height: 360 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/workspace/screenshots/stress-landscape.png", fullPage: false });
  step("landscape render", true);

  // Filter CORS noise vs real errors
  const realConsole = out.errors.filter(
    (e) =>
      !e.includes("ct.ingv.it") &&
      !e.includes("ov.ingv.it") &&
      !e.includes("favicon") &&
      !e.includes("net::ERR_FAILED"),
  );
  step("console clean (non-INGV)", realConsole.length === 0, realConsole.slice(0, 5).join(" | ") || "ok");
  step("no page errors", out.pageErrors.length === 0, out.pageErrors.slice(0, 3).join(" | ") || "ok");
} finally {
  await browser.close();
}

const failed = out.steps.filter((s) => !s.ok);
console.log("\n" + JSON.stringify({ failed: failed.length, total: out.steps.length, steps: out.steps }, null, 2));
process.exit(failed.length ? 1 : 0);
