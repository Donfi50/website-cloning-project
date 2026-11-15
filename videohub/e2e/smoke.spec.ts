import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const db = new PrismaClient();
const email = `e2e-${Date.now()}@example.com`;
const password = "e2e-password-123";
const title = `E2E video ${Date.now()}`;
const sample = "e2e/.tmp/sample.mp4";

test.beforeAll(() => {
  mkdirSync("e2e/.tmp", { recursive: true });
  // 8 seconds of test pattern + tone, so playback and the 5-second view threshold can be exercised.
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=30", "-f", "lavfi", "-i", "sine=frequency=440", "-t", "8", "-pix_fmt", "yuv420p", sample]);
});
test.afterAll(async () => { await db.$disconnect(); });

test("sign up, upload, play, interact, delete account", async ({ page }) => {
  await test.step("register and verify", async () => {
    await page.goto("/register");
    await page.getByPlaceholder("Name").fill("E2E User");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password (8+ characters)").fill(password);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    // Stand-in for clicking the emailed link.
    await db.user.update({ where: { email }, data: { emailVerified: new Date() } });
  });

  await test.step("sign in", async () => {
    await page.goto("/signin");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("link", { name: "My videos" })).toBeVisible();
  });

  let videoId = "";
  await test.step("upload from the browser (presigned PUT + CORS)", async () => {
    await page.goto("/upload");
    await page.getByPlaceholder("Title").fill(title);
    await page.getByPlaceholder("Tags, separated by commas (up to 8)").fill("e2e, smoke");
    await page.locator('input[type="file"]').setInputFiles(sample);
    await page.getByRole("button", { name: "Upload" }).click();
    await expect(page.getByText("Processing. It will appear once ready.")).toBeVisible({ timeout: 30_000 });
    const v = await db.video.findFirstOrThrow({ where: { title } });
    videoId = v.id;
  });

  await test.step("wait for the worker to publish it (npm run worker must be running)", async () => {
    await expect.poll(async () => (await db.video.findUnique({ where: { id: videoId } }))?.status, { timeout: 90_000, intervals: [2000] }).toBe("READY");
    await page.goto("/");
    await expect(page.getByText(title)).toBeVisible();
  });

  await test.step("play the HLS stream and count one view", async () => {
    await page.goto(`/watch/${videoId}`);
    const video = page.locator("video");
    await video.evaluate(async (v: HTMLVideoElement) => { v.muted = true; await v.play(); });
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 30_000 }).toBeGreaterThan(5);
    await expect.poll(async () => (await db.video.findUnique({ where: { id: videoId } }))?.views, { timeout: 15_000 }).toBe(1);
  });

  await test.step("like, comment, report, save to playlist", async () => {
    await page.getByRole("button", { name: /Like/ }).click();
    await expect(page.getByRole("button", { name: /Liked · 1/ })).toBeVisible();

    await page.getByPlaceholder("Add a comment").fill("Great e2e video");
    await page.getByRole("button", { name: "Comment" }).click(); // page reloads
    await expect(page.getByText("Great e2e video")).toBeVisible();

    page.once("dialog", d => d.accept("e2e report reason"));
    await page.getByRole("button", { name: "Report" }).click();
    await expect(page.getByText("Thanks, we'll review it.")).toBeVisible();

    await page.getByText("Save to playlist").click();
    await page.getByPlaceholder("New playlist").fill("E2E list");
    await page.getByRole("button", { name: "Create and save" }).click();
    await expect(page.getByLabel("E2E list")).toBeChecked();
  });

  await test.step("delete the account from the UI", async () => {
    await page.goto("/account");
    await page.getByPlaceholder("Your password").fill(password);
    await page.getByPlaceholder("Type DELETE to confirm").fill("DELETE");
    await page.getByRole("button", { name: "Permanently delete my account" }).click();
    await expect.poll(async () => db.user.count({ where: { email } }), { timeout: 20_000 }).toBe(0);
    expect(await db.video.count({ where: { id: videoId } })).toBe(0);
  });
});
