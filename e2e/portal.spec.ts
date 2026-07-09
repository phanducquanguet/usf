import { test, expect } from "@playwright/test";

test.describe("Customer portal", () => {
  test("unauthenticated visitor sees the portal at /", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId("portal-root")).toBeVisible();
    await expect(page.getByRole("link", { name: /đăng nhập|sign in/i })).toBeVisible();
  });

  test("login page is still reachable", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });
});
