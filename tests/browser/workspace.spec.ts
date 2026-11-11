import { test, expect } from "@playwright/test";
const original =
  "#page=studio&size=all&payment=all&outcome=all&period=recent&session=S-1042-0&event=0&moment=1792672200000&record=&origin=&stage=6&compare=false&cohortA=large-split&cohortB=small-split&mode=reached";

test("workspace selector isolates navigation and opens the correct landing page", async ({
  page,
}) => {
  await page.goto("./");
  const workspace = page.getByRole("combobox", {
    name: "Workspace",
    exact: true,
  });
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveValue("investigate");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button"),
  ).toHaveCount(3);
  await workspace.selectOption("builder");
  const nav = page.getByRole("navigation", { name: "Builder navigation" });
  await expect(nav.getByRole("button")).toHaveCount(5);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Journey Analysis", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Investigation Studio", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Build a metric for Group Orders",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/workspace-builder-desktop.png",
    fullPage: true,
  });
  await nav.getByRole("button", { name: "Data Catalog", exact: true }).click();
  await page
    .getByRole("link", { name: "THREAD JOURNEY INTELLIGENCE", exact: true })
    .click();
  await expect(workspace).toHaveValue("builder");
  await expect(
    nav.getByRole("button", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await workspace.selectOption("investigate");
  await expect(
    page.getByRole("heading", { name: "Group Orders.", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button"),
  ).toHaveCount(3);
  await expect(nav).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Data Catalog", exact: true }),
  ).toHaveCount(0);
});

test("workspace switching preserves deep-link context, keyboard access, refresh and history", async ({
  page,
}) => {
  await page.goto("./" + original);
  const workspace = page.getByRole("combobox", {
    name: "Workspace",
    exact: true,
  });
  await expect(workspace).toBeVisible();
  await workspace.focus();
  await workspace.press("ArrowDown");
  await workspace.press("Enter");
  await expect(workspace).toHaveValue("builder");
  for (const [key, value] of new URLSearchParams(original.slice(1)))
    if (key !== "page")
      expect(
        new URLSearchParams(new URL(page.url()).hash.slice(1)).get(key),
      ).toBe(value);
  await page.getByRole("button", { name: "Data Catalog", exact: true }).click();
  await page.reload();
  await expect(workspace).toHaveValue("builder");
  await expect(
    page.getByRole("heading", { name: "Data Catalog", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/builderView=overview/);
  await page.goBack();
  await expect(page).toHaveURL(original);
  await expect(workspace).toHaveValue("investigate");
  await expect(
    page.getByRole("button", { name: "Investigation Studio", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goForward();
  await expect(workspace).toHaveValue("builder");
});

test("workspace landing changes retain the active draft and explicit investigation handoff", async ({
  page,
}) => {
  await page.goto("./#page=builder&builderView=metric");
  const workspace = page.getByRole("combobox", {
    name: "Workspace",
    exact: true,
  });
  await expect(workspace).toBeVisible();
  await page
    .getByRole("textbox", { name: "Metric name", exact: true })
    .fill("Draft across workspaces");
  await workspace.selectOption("investigate");
  await workspace.selectOption("builder");
  await page
    .getByRole("button", { name: "Continue draft", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Metric name", exact: true }),
  ).toHaveValue("Draft across workspaces");
  await page
    .getByRole("button", { name: "Validation & Publishing", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Query published metric", exact: true })
    .click();
  await page.getByRole("button", { name: "Run Query", exact: true }).click();
  await page
    .getByRole("button", { name: "Investigate this cohort", exact: true })
    .click();
  await expect(page).toHaveURL(/page=journey/);
  await expect(workspace).toHaveValue("investigate");
  await expect(
    page.getByRole("navigation", { name: "Builder navigation" }),
  ).toHaveCount(0);
  await workspace.selectOption("builder");
  await page
    .getByRole("button", { name: "Continue draft", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Metric name", exact: true }),
  ).toHaveValue("Draft across workspaces");
});

for (const width of [820, 390])
  test(`workspace selector and isolated menu remain usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto("./" + original);
    const workspace = page.getByRole("combobox", {
      name: "Workspace",
      exact: true,
    });
    await expect(workspace).toHaveCount(1);
    await expect(workspace).toBeVisible();
    await workspace.selectOption("builder");
    await page
      .getByRole("button", { name: "Data Catalog", exact: true })
      .click();
    await expect(
      page
        .getByRole("navigation", { name: "Builder navigation" })
        .getByRole("button"),
    ).toHaveCount(5);
    await expect(
      page.getByRole("button", { name: "Journey Analysis", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/workspace-builder-${width}.png`,
      fullPage: true,
    });
    await workspace.selectOption("investigate");
    await expect(
      page.getByRole("heading", { name: "Group Orders.", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
