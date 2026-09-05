import { test, expect } from "@playwright/test";
import path from "path";

const PHOTO_PATH = path.join(__dirname, "fixtures", "test-photo.png");

test.describe("Homepage", () => {
  test("shows the hero, brand, and primary CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /which pet shines/i })).toBeVisible();
    await expect(page.getByText("Your pet. Their pet. You decide.").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /vote now/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /enter your pet/i }).first()).toBeVisible();
  });

  test("primary navigation reaches every main section", async ({ page }) => {
    await page.goto("/");
    for (const [label, urlPart] of [
      ["Bracket", "/bracket"],
      ["Pet of the Month", "/pet-of-the-month"],
      ["Hall of Fame", "/hall-of-fame"],
      ["Rules", "/rules"],
    ] as const) {
      await page.getByRole("link", { name: label, exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(urlPart.replace("/", "\\/")));
      await page.goto("/");
    }
  });
});

test.describe("Enter your pet journey", () => {
  test("submitting a valid entry redirects to the confirmation page", async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@example.com`;

    await page.goto("/enter");
    await page.getByLabel(/pet's name/i).fill("E2E Test Pet");
    await page.locator('input[name="photo"]').setInputFiles(PHOTO_PATH);
    await page.getByLabel(/your email/i).fill(uniqueEmail);
    await page.getByRole("checkbox").check();

    await page.getByRole("button", { name: /enter your pet/i }).click();

    await expect(page).toHaveURL(/\/enter\/thank-you/);
    await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();
  });

  test("rejects a second entry from the same email in the same week", async ({ page }) => {
    const uniqueEmail = `e2e-dup-${Date.now()}@example.com`;

    for (let i = 0; i < 2; i++) {
      await page.goto("/enter");
      await page.getByLabel(/pet's name/i).fill(`Duplicate Pet ${i}`);
      await page.locator('input[name="photo"]').setInputFiles(PHOTO_PATH);
      await page.getByLabel(/your email/i).fill(uniqueEmail);
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: /enter your pet/i }).click();

      if (i === 0) {
        await expect(page).toHaveURL(/\/enter\/thank-you/);
      } else {
        await expect(page.getByText(/already entered a pet in this week/i)).toBeVisible();
      }
    }
  });
});

test.describe("Bracket and pet pages", () => {
  test("bracket page renders without error", async ({ page }) => {
    const response = await page.goto("/bracket");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: /bracket/i })).toBeVisible();
  });

  test("hall of fame and pet of the month render without error", async ({ page }) => {
    for (const url of ["/hall-of-fame", "/pet-of-the-month"]) {
      const response = await page.goto(url);
      expect(response?.status()).toBeLessThan(500);
    }
  });
});

test.describe("Voting journey", () => {
  test("finding a live matchup (or the friendly empty state) works end-to-end", async ({ page }) => {
    const response = await page.goto("/vote");
    expect(response?.status()).toBeLessThan(500);

    const votingUI = page.getByRole("button", { name: /vote for/i }).first();
    const emptyState = page.getByText(/no live matchup right now/i);

    await expect(votingUI.or(emptyState)).toBeVisible({ timeout: 10_000 });

    if (await votingUI.isVisible().catch(() => false)) {
      await votingUI.click();
      await expect(page.getByText(/thanks for voting/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /next matchup/i })).toBeVisible();
    }
  });
});

test.describe("Admin security", () => {
  test("the admin dashboard is not publicly accessible", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("wrong credentials are rejected", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill("nope@example.com");
    await page.getByLabel(/password/i).fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
