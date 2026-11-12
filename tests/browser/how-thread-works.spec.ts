import { test, expect } from "@playwright/test";

test("sidebar keeps only help and explains both workspaces from either workspace", async ({
  page,
}) => {
  await page.goto("./");
  const sidebar = page.locator("aside.sidebar");
  await expect(
    sidebar.locator(".thread-illustration, .sidebar-footer"),
  ).toHaveCount(0);
  await expect(
    sidebar.getByText("The whole story, connected.", { exact: true }),
  ).toHaveCount(0);
  const help = sidebar.getByRole("button", {
    name: "How THREAD works",
    exact: true,
  });
  for (const workspace of ["Investigation Studio", "Builder Studio"]) {
    await page
      .getByRole("navigation", { name: "Workspaces" })
      .getByRole("button", { name: workspace, exact: true })
      .click();
    await expect(help).toBeVisible();
    await help.click();
    const dialog = page.getByRole("dialog", {
      name: "How THREAD works",
      exact: true,
    });
    await expect(
      dialog.getByRole("heading", { name: "Builder Studio", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("heading", {
        name: "Investigation Studio",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("heading", {
        name: "Follow the same cohort",
        exact: true,
      }),
    ).toBeVisible();
    await expect(dialog).toContainText("No Grab integration");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(help).toBeFocused();
  }
  await page.screenshot({
    path: "test-results/sidebar-help-only.png",
    fullPage: true,
  });
});

test("explanation fits laptop and mobile screens with a reachable close control and scrollable details", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("./#page=builder&builderView=overview");
    if (viewport.width <= 900) {
      await expect(page.locator(".sidebar-help")).toBeHidden();
    }
    const opener = page
      .getByRole("button", { name: "How THREAD works", exact: true })
      .last();
    await opener.focus();
    await opener.press("Enter");
    const dialog = page.getByRole("dialog", {
      name: "How THREAD works",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/how-thread-works-${viewport.width}x${viewport.height}.png`,
    });
    await dialog.getByText("Metric definitions", { exact: true }).click();
    await dialog.getByText("Platform foundations", { exact: true }).click();
    const content = dialog.locator(".how-thread-content");
    await content.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(
      dialog.getByRole("button", { name: "Close dialog", exact: true }),
    ).toBeInViewport();
    await expect(dialog.locator(".how-thread-scope")).toBeInViewport();
    expect(
      await content.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest('[role="dialog"]'),
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
  expect(errors).toEqual([]);
});
