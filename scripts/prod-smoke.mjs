#!/usr/bin/env node
/**
 * Production-build smoke: build is separate; this hits a running URL
 * and asserts visible content + no module MIME failures.
 * Usage: node scripts/prod-smoke.mjs [url]
 */
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.waitForTimeout(5000);
const text = await page.locator("body").innerText();
const mapH = await page.evaluate(() => {
  const m = document.querySelector(".leaflet-container");
  return m ? Math.round(m.getBoundingClientRect().height) : 0;
});
const mimeFail = errors.some((e) => /Failed to load module script|MIME type/i.test(e));
const windowErr = errors.some((e) => /window is not defined/i.test(e));
const ok =
  /WolfWatch/i.test(text) &&
  text.length > 200 &&
  !mimeFail &&
  !windowErr &&
  errors.length === 0;

console.log(
  JSON.stringify(
    {
      ok,
      url,
      mapH,
      bodyLen: text.length,
      hasTitle: /WolfWatch/i.test(text),
      hasToday: /Today|Attn/i.test(text),
      errors: errors.slice(0, 8),
      mimeFail,
    },
    null,
    2,
  ),
);
await browser.close();
process.exit(ok ? 0 : 1);
