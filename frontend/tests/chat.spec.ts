import { expect, test } from "@playwright/test";

test("renders the chat composer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("How can I help?")).toBeVisible();
  await expect(page.getByPlaceholder("Message gpt-copy-v1")).toBeVisible();
});
