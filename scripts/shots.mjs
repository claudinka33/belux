import { chromium } from "playwright";

const base = "http://localhost:3000";
const out = "/tmp/shots";
import fs from "fs"; fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" ?? undefined });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

async function shot(name, full = false) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: full });
  console.log("✓", name);
}

// 1. domača stran
await page.goto(base, { waitUntil: "networkidle" });
await shot("01-domov", true);

// 2. naročanje — storitev
await page.goto(base + "/naroci", { waitUntil: "networkidle" });
await page.click("text=Trepalnice", { timeout: 5000 }).catch(() => {});
await shot("02-naroci-storitev");

// 3. izberi storitev -> koledar
await page.click("text=Klasične trepalnice 1:1 - prvič").catch(() => {});
await page.waitForTimeout(1200);
await shot("03-naroci-datum");

// 4. izberi prvi prosti dan
const day = page.locator("button:not([disabled])").filter({ hasText: /^\d+$/ }).first();
await day.click().catch(() => {});
await page.waitForTimeout(1200);
await shot("04-naroci-ura");

// izberi prvi slot in naprej
await page.locator("button", { hasText: /^\d{2}:\d{2}$/ }).first().click().catch(() => {});
await page.click("text=Naslednji korak").catch(() => {});
await page.waitForTimeout(600);
await shot("05-naroci-podatki");

// admin prijava
await page.goto(base + "/prijava", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "anita@belux.si");
await page.fill('input[type="password"]', "belux2026");
await page.click("button:has-text('Prijava')");
await page.waitForTimeout(1500);
await page.goto(base + "/admin", { waitUntil: "networkidle" });
await shot("06-admin-pregled");

await page.goto(base + "/admin/storitve", { waitUntil: "networkidle" });
await shot("07-admin-storitve");

await page.goto(base + "/admin/urnik", { waitUntil: "networkidle" });
await shot("08-admin-urnik", true);

await page.goto(base + "/admin/nastavitve", { waitUntil: "networkidle" });
await shot("09-admin-nastavitve", true);

await browser.close();
