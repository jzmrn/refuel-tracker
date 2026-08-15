const { chromium } = require("playwright");
const fs = require("fs");

const BASE = process.env.BASE_URL || "http://localhost:3001";
const path = require("path");
const OUT =
  process.env.OUT_DIR || path.resolve(__dirname, "../../docs/screenshots");
const CAR = process.env.CAR_ID;
const STATION = process.env.STATION_ID;

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
}

async function panel(page, title) {
  const p = page
    .locator(".panel, .card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    .first();
  await p.waitFor({ state: "visible", timeout: 30000 });
  await p.evaluate((el) => {
    const y = el.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top: Math.max(y, 0), behavior: "instant" });
  });
  await page.waitForTimeout(1200);
  return p;
}

async function shootMobile(browser, name, url, title) {
  const ctx = await browser.newContext({
    viewport: MOBILE,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await panel(page, title);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
  console.log(`✓ ${name}.png`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  await shootMobile(
    browser,
    "mobile-distance-since-refuel",
    `/cars/${CAR}/refuels`,
    "Distance Since Last Refuel",
  );
  await shootMobile(
    browser,
    "mobile-station-comparison",
    `/prices/stations/${STATION}/stats`,
    "Station vs Place vs Brand",
  );
  await shootMobile(
    browser,
    "mobile-cost-per-100km",
    `/cars/${CAR}/refuels`,
    "Cost per 100km",
  );
  await shootMobile(
    browser,
    "mobile-kilometer-history",
    `/cars/${CAR}/distance`,
    "Kilometer History",
  );

  const ctx = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 2,
    locale: "en-US",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/cars/${CAR}/refuels/all`, {
    waitUntil: "domcontentloaded",
  });
  await settle(page);
  await page.screenshot({ path: `${OUT}/desktop-refuel-list.png` });
  await ctx.close();
  console.log("✓ desktop-refuel-list.png");

  await browser.close();
})();
