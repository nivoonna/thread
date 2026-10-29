import { test, expect } from "@playwright/test";
test("brief reading view, export and supporting links stay connected on laptop and narrow layouts", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("./#page=studio&size=large&payment=split&session=S-1042-0");
  await page
    .getByRole("button", { name: "Investigate this journey", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recommended validation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create investigation brief", exact: true })
    .first()
    .click();
  const article = page.getByRole("article", {
    name: "Investigation brief document",
  });
  await expect(article).toBeVisible();
  const plain = await page
    .getByLabel("Investigation brief", { exact: true })
    .inputValue();
  for (const text of await article
    .locator(".brief-section p, .brief-section li")
    .allTextContents())
    expect(plain).toContain(text);
  await page.screenshot({
    path: "test-results/brief-reading-laptop.png",
    animations: "disabled",
  });
  await article
    .getByRole("heading", { name: "3. How broadly this applies" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/brief-reasoning.png",
    animations: "disabled",
  });
  await article.locator("summary").click();
  const first = article.getByRole("link").first();
  const href = await first.getAttribute("href");
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    first.click(),
  ]);
  await popup.waitForURL(href!);
  await expect(
    popup.getByRole("heading", { name: "Group Order funnel", exact: true }),
  ).toBeVisible();
  await popup.close();
  await page.getByText("View plain-text version", { exact: true }).click();
  await expect(
    page.getByLabel("Investigation brief", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy brief", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(plain);
  await page.getByText("View plain-text version", { exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await article.evaluate((el) => (el.scrollTop = 0));
  await expect(
    page.getByRole("heading", {
      name: "Your investigation brief",
      exact: true,
    }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Close dialog" }),
  ).toBeInViewport();
  await page.screenshot({
    path: "test-results/brief-reading-narrow.png",
    animations: "disabled",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  const box = await page.getByRole("dialog").boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(
    page
      .getByRole("button", { name: "Create investigation brief", exact: true })
      .first(),
  ).toBeFocused();
  expect(errors).toEqual([]);
});
