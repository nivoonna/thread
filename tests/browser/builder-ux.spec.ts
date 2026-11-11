import { test, expect } from "@playwright/test";

test("saved draft is protected when creating another metric", async ({
  page,
}) => {
  await page.goto("./#page=builder&builderView=metric");
  await page
    .getByRole("textbox", { name: "Metric name", exact: true })
    .fill("Saved working definition");
  await page
    .getByRole("textbox", { name: "Business owner", exact: true })
    .fill("Review owner");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("button", { name: "Data Catalog", exact: true }).click();
  await page
    .getByRole("button", { name: "Create metric", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Keep or replace your draft?",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Saved working definition");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("button", { name: "Create metric", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Continue current draft", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Metric name", exact: true }),
  ).toHaveValue("Saved working definition");
  await expect(
    page.getByRole("textbox", { name: "Business owner", exact: true }),
  ).toHaveValue("Review owner");
  await page.getByRole("button", { name: "Data Catalog", exact: true }).click();
  await page
    .getByRole("button", { name: "Create metric", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Discard and start new draft", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Metric name", exact: true }),
  ).toHaveValue("Group Order Completion Rate");
});

test("version history also protects edits but untouched drafts need no confirmation", async ({
  page,
}) => {
  await page.goto("./#page=builder&builderView=validation");
  const failure = () =>
    page
      .getByRole("row")
      .filter({ hasText: "payment_failure_rate" })
      .getByRole("button", { name: "New draft from v1", exact: true });
  await failure().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Metric name", exact: true })
    .fill("Payment review draft");
  await page
    .getByRole("button", { name: "Validate draft", exact: true })
    .click();
  const completion = () =>
    page
      .getByRole("row")
      .filter({ hasText: "group_order_completion_rate" })
      .getByRole("button", { name: "New draft from v1", exact: true });
  await completion().click();
  const dialog = page.getByRole("dialog", {
    name: "Keep or replace your draft?",
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Continue current draft", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Metric name", exact: true }),
  ).toHaveValue("Payment review draft");
  await page
    .getByRole("button", { name: "Validate draft", exact: true })
    .click();
  await completion().click();
  await dialog
    .getByRole("button", { name: "Discard and start new draft", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Metric name", exact: true }),
  ).toHaveValue("Group Order Completion Rate");
});

test("catalog details and actions follow results while explicit asset links clear incompatible filters", async ({
  page,
}) => {
  await page.goto("./#page=builder&builderView=catalog");
  const details = page.getByRole("region", { name: "Asset details" }),
    search = page.getByRole("textbox", { name: "Search assets" });
  await search.fill("missing_asset");
  await expect(page.getByRole("status")).toContainText("No assets");
  await expect(details).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Create metric", exact: true }),
  ).toHaveCount(0);
  await search.fill("");
  await expect(details).toBeVisible();
  await page
    .getByRole("combobox", { name: "Type", exact: true })
    .selectOption("dataset");
  await expect(details).toHaveCount(0);
  await page
    .getByRole("button", { name: "order_transactions", exact: true })
    .click();
  await expect(details).toContainText("order_transactions");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Certified");
  await expect(details).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("");
  await expect(details).toBeVisible();
  await page
    .getByRole("combobox", { name: "Domain", exact: true })
    .selectOption("Payments");
  await expect(details).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Domain", exact: true })
    .selectOption("");
  await search.fill("order_transactions");
  await page
    .getByRole("button", {
      name: "Inspect compatible modeled source",
      exact: true,
    })
    .click();
  await expect(
    details.getByRole("heading", { name: "group_orders", exact: true }),
  ).toBeVisible();
  await expect(search).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Type", exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("combobox", { name: "Type", exact: true })
    .selectOption("product");
  await search.fill("group_orders");
  await page
    .getByRole("button", { name: "Inspect and reuse it", exact: true })
    .click();
  await expect(
    details.getByRole("heading", {
      name: "group_order_completion_rate",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use existing metric", exact: true }),
  ).toBeVisible();
});

test.describe("touch help", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 820, height: 1100 },
  });
  test("first tap opens, second tap closes and tapping outside dismisses", async ({
    page,
  }) => {
    await page.goto("./#page=builder&builderView=catalog");
    const help = page.getByRole("button", { name: "About certified assets" });
    await help.tap();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(help).toHaveAttribute("aria-expanded", "true");
    await help.tap();
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await help.tap();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page
      .getByRole("heading", { name: "Data Catalog", exact: true })
      .tap();
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });
});

test("help retains hover, focus, Escape and blur behavior", async ({
  page,
}) => {
  await page.goto("./#page=builder&builderView=catalog");
  const help = page.getByRole("button", { name: "About certified assets" });
  await help.hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await help.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await help.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await help.press("Enter");
  await expect(page.getByRole("tooltip")).toBeVisible();
  await help.press("Tab");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});
