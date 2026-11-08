import path from "node:path";
import fs from "node:fs";
import { test, expect } from "@playwright/test";

async function signUp(page: import("@playwright/test").Page, practiceName: string, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("E2E Practice Owner");
  await page.getByLabel("Practice name").fill(practiceName);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill("E2EPassword123!");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 90_000 });
}

test("new user can sign up, import, audit and share a revocable report", async ({ page, browser, request }) => {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const email = `e2e.${unique}@example.test`;
  const practiceName = `E2E Dental ${unique}`;
  const origin = "http://127.0.0.1:3000";

  await signUp(page, practiceName, email);
  await page.getByRole("link", { name: /Import patients/i }).click();
  await expect(page).toHaveURL(/\/app\/import/, { timeout: 60_000 });

  await page.locator("#import-file").setInputFiles(path.join(process.cwd(), "fixtures", "e2e-import.csv"));
  await page.getByRole("button", { name: /Upload and detect columns/i }).click();
  await expect(page.getByText("Confirm column mapping")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Validate mapping" }).click();

  await expect(page.getByText("Review before committing")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/with errors/i)).toBeVisible();
  await expect(page.getByText("Validation errors")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: /Download error CSV/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("recallpilot-validation-errors");

  await page.getByRole("button", { name: /Commit \d+ valid rows/i }).click();
  await expect(page.getByText("The audit is ready.")).toBeVisible({ timeout: 60_000 });

  const href = await page.getByRole("link", { name: "Open report" }).getAttribute("href");
  expect(href).toMatch(/^\/audit\/[A-Za-z0-9_-]+$/);
  const token = href!.replace("/audit/", "");

  await page.getByRole("link", { name: "Open report" }).click();
  await expect(page.getByRole("heading", { name: "Recall revenue audit" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Assumptions behind every estimate")).toBeVisible();
  await expect(page.getByText("Assumption").first()).toBeVisible();
  await expect(page.getByText("Estimated production at risk", { exact: true })).toBeVisible();

  const pdf = await request.get(`${origin}/api/audits/${token}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  const pdfBody = await pdf.body();
  expect(pdfBody.subarray(0, 4).toString()).toBe("%PDF");

  const sharedContext = await browser.newContext();
  const sharedPage = await sharedContext.newPage();
  await sharedPage.goto(`${origin}${href}`);
  await expect(sharedPage.getByRole("heading", { name: "Recall revenue audit" })).toBeVisible();
  await sharedContext.close();

  await page.goto("/app/revenue");
  await page.getByRole("button", { name: "Revoke link" }).click();
  await expect(page.getByText("Expired or revoked")).toBeVisible({ timeout: 20_000 });

  const revokedContext = await browser.newContext();
  const revokedPage = await revokedContext.newPage();
  await revokedPage.goto(`${origin}${href}`);
  await expect(revokedPage.getByText("This report link is no longer available")).toBeVisible();
  await revokedContext.close();
});

test("public audit accepts a semicolon/DD.MM.YYYY Windows-1252 export", async ({ page, request }) => {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const email = `semicolon.${unique}@example.test`;
  const origin = "http://127.0.0.1:3000";

  await page.goto("/audit");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Practice name").fill(`Semicolon Audit ${unique}`);
  await page.getByRole("checkbox").click();
  await page
    .locator("#file")
    .setInputFiles(path.join(process.cwd(), "seed", "bright-dental-semicolon-ddmmyyyy.csv"));
  await page.getByRole("button", { name: /Run the free audit/i }).click();

  await expect(page).toHaveURL(/\/audit\/[A-Za-z0-9_-]+/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Recall revenue audit" })).toBeVisible({ timeout: 90_000 });
  const token = page.url().split("/audit/")[1]!;

  await expect(page.getByText("Estimated production at risk", { exact: true })).toBeVisible();
  const pdf = await request.get(`${origin}/api/audits/${token}/pdf`);
  expect(pdf.status()).toBe(200);
});

test("public audit runs without an account and emails a report", async ({ page, request }) => {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const email = `public.${unique}@example.test`;
  const origin = "http://127.0.0.1:3000";

  await page.goto("/audit");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Practice name").fill(`Public Audit ${unique}`);
  await page.getByRole("checkbox").click();
  await page.locator("#file").setInputFiles(path.join(process.cwd(), "fixtures", "e2e-import.csv"));
  await page.getByRole("button", { name: /Run the free audit/i }).click();

  await expect(page).toHaveURL(/\/audit\/[A-Za-z0-9_-]+/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Recall revenue audit" })).toBeVisible({ timeout: 90_000 });
  const token = page.url().split("/audit/")[1]!;

  await expect(page.getByText("This report is a planning estimate")).toBeVisible();
  await expect(page.getByText("Assumptions behind every estimate")).toBeVisible();

  const pdf = await request.get(`${origin}/api/audits/${token}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");

  const outboxDir = path.join(process.cwd(), ".outbox");
  const files = fs.existsSync(outboxDir) ? fs.readdirSync(outboxDir) : [];
  const emailSent = files
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(outboxDir, file), "utf8")) as { to?: string })
    .some((message) => message.to === email);
  expect(emailSent).toBe(true);
});
