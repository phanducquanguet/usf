import { test, expect } from "@playwright/test";

test.describe("Customer portal", () => {
  test("unauthenticated visitor sees the portal at /", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId("portal-root")).toBeVisible();
    await expect(page.getByRole("link", { name: /đăng nhập|sign in/i })).toBeVisible();
  });

  test("visitor can scroll the landing with the mouse wheel", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("portal-root")).toBeVisible();
    // The dashboard root layout locks <body> scrolling; the landing must
    // restore native document scroll or wheel/trackpad input does nothing.
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, 800);
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeGreaterThan(0);
  });

  test("login page is still reachable", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });
});
