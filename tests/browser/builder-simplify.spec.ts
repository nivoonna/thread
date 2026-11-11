import { test, expect, type Page } from "@playwright/test";
const nav = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Builder navigation" })
    .getByRole("button", { name, exact: true });
const completion = "group_order_completion_rate";
async function publishAll(page: Page) {
  await page.goto("./#page=builder&builderView=metric");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Creation cohort", exact: true })
    .selectOption("all");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Calculate preview", exact: true })
    .click();
  await expect(page.locator(".builder-result")).toHaveText("68.07%");
  await page
    .getByRole("button", { name: "Validate draft", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "window" }),
  ).toContainText("recent");
  await expect(
    page.getByRole("row").filter({ hasText: "window" }),
  ).toContainText("all");
  await page
    .getByRole("button", { name: "Run validation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publish version", exact: true })
    .click();
}

test("publish retains its state, query uses the published cohort and consumers keep matching pins", async ({
  page,
}) => {
  await publishAll(page);
  await expect(page.getByText("Published v2", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish version", exact: true }),
  ).toHaveCount(0);
  await nav(page, "Overview").click();
  await expect(
    page.getByRole("heading", { name: "Your draft", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Needs attention", { exact: true })).toHaveCount(
    0,
  );
  await nav(page, "Validation & Publishing").click();
  await expect(page.getByText("Published v2", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Query published metric", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Creation cohort (UTC)", exact: true }),
  ).toHaveValue("all");
  await expect(
    page.getByRole("button", { name: "Investigate this cohort", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Run Query", exact: true }).click();
  await expect(page.locator(".builder-result")).toHaveText("68.07%");
  await expect(page.getByLabel("API response")).toContainText(
    '"denominator": 1500',
  );
  await page
    .getByText("Consumer examples · 3 pinned integrations", { exact: true })
    .click();
  const rows = page.locator(".builder-row");
  await expect(rows).toHaveCount(3);
  for (const row of await rows.all()) {
    await expect(row).toContainText("v1 · all");
    await expect(row).toContainText("68.07%");
  }
  await page
    .getByRole("combobox", { name: "Creation cohort (UTC)", exact: true })
    .selectOption("previous");
  await page
    .getByRole("combobox", { name: "Payment mode", exact: true })
    .selectOption("single");
  await page.getByRole("button", { name: "Run Query", exact: true }).click();
  await expect(page.getByLabel("API response")).toContainText(
    '"numerator": 236',
  );
  await expect(page.getByLabel("API response")).toContainText(
    '"denominator": 302',
  );
  for (const row of await rows.all()) {
    await expect(row).toContainText("v1 · previous");
    await expect(row).toContainText("78.15%");
  }
  await page
    .getByRole("combobox", { name: "Metric", exact: true })
    .selectOption("payment_failure_rate");
  await expect(
    page.getByRole("combobox", { name: "Creation cohort (UTC)", exact: true }),
  ).toHaveValue("recent");
  await expect(
    page.getByText("No consumers are pinned to this metric in the demo."),
  ).toBeVisible();
  await expect(
    page.getByText("Product dashboard", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Metric", exact: true })
    .selectOption(completion);
  await expect(
    page.getByRole("combobox", { name: "Creation cohort (UTC)", exact: true }),
  ).toHaveValue("all");
  await page
    .getByRole("combobox", { name: "Version", exact: true })
    .selectOption("1");
  await expect(
    page.getByRole("combobox", { name: "Creation cohort (UTC)", exact: true }),
  ).toHaveValue("recent");
});

test("normal discovery and queries prefer active versions while deprecated pins remain queryable", async ({
  page,
}) => {
  await publishAll(page);
  const row = page
    .getByRole("row")
    .filter({ hasText: completion })
    .filter({ hasText: "v2 ·" });
  await row.getByRole("button", { name: "Deprecate v2", exact: true }).click();
  await page
    .getByRole("button", { name: "Keep published", exact: true })
    .click();
  await expect(row).toContainText("Published");
  await row.getByRole("button", { name: "Deprecate v2", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm deprecation", exact: true })
    .click();
  await expect(row).toContainText("Deprecated");
  await nav(page, "Data Catalog").click();
  await page.getByRole("button", { name: completion, exact: true }).click();
  await expect(
    page.getByRole("row").filter({
      has: page.getByRole("button", { name: completion, exact: true }),
    }),
  ).toContainText("Certified");
  await page
    .getByRole("button", { name: "Use existing metric", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Version", exact: true }),
  ).toHaveValue("1");
  await page
    .getByRole("combobox", { name: "Version", exact: true })
    .selectOption("2");
  await page.getByRole("button", { name: "Run Query", exact: true }).click();
  await expect(page.getByLabel("API response")).toContainText(
    '"lifecycle": "Deprecated"',
  );
  await expect(page.getByLabel("API response")).toContainText(
    '"denominator": 1500',
  );
  await expect(
    page.getByText("Deprecated version retained for pinned consumers."),
  ).toBeVisible();
});

test("query-to-investigate maps the exact cohort and retains actual replay context", async ({
  page,
}) => {
  const original =
    "#page=studio&size=large&payment=split&outcome=completed&period=recent&session=S-1042-0&event=0&moment=1792672200000&record=&origin=&stage=6&compare=false&cohortA=large-split&cohortB=small-split&mode=reached";
  await page.goto("./" + original);
  await page
    .getByRole("combobox", { name: "Workspace", exact: true })
    .selectOption("builder");
  await nav(page, "API Playground").click();
  await page
    .getByRole("combobox", { name: "Creation cohort (UTC)", exact: true })
    .selectOption("previous");
  await page
    .getByRole("combobox", { name: "Payment mode", exact: true })
    .selectOption("single");
  await page.getByRole("button", { name: "Run Query", exact: true }).click();
  await expect(page.getByLabel("API response")).toContainText(
    '"denominator": 302',
  );
  await page
    .getByRole("button", { name: "Investigate this cohort", exact: true })
    .click();
  const hash = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(
    Object.fromEntries(
      ["page", "size", "payment", "outcome", "period", "session", "moment"].map(
        (k) => [k, hash.get(k)],
      ),
    ),
  ).toEqual({
    page: "journey",
    size: "all",
    payment: "single",
    outcome: "all",
    period: "previous",
    session: "S-1042-0",
    moment: "1792672200000",
  });
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/page=builder/);
  await page.goForward();
  await expect(page).toHaveURL(/period=previous/);
  await page.reload();
  await expect(page).toHaveURL(/payment=single/);
});

test("authoring requires a definition and exposes accurately labelled technical controls", async ({
  page,
}) => {
  await page.goto("./#page=builder&builderView=metric");
  await nav(page, "Validation & Publishing").click();
  await expect(
    page.getByRole("heading", { name: "Change impact vs v1", exact: true }),
  ).toHaveCount(0);
  await nav(page, "Metric Builder").click();
  const name = page.getByRole("textbox", { name: "Metric name", exact: true });
  await name.fill("");
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await name.fill("Group Order Completion Rate");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Modeled source")).toHaveValue("group_orders");
  await expect(page.getByLabel("Modeled source").locator("option")).toHaveCount(
    1,
  );
  await page
    .getByText("Calculation semantics and source schema", { exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Denominator eligibility", exact: true }),
  ).toHaveValue("eligible = true");
  await expect(
    page.getByRole("textbox", { name: "Distinct entity grain", exact: true }),
  ).toHaveValue("group_id");
  await page
    .getByRole("button", { name: "About entity grain", exact: true })
    .focus();
  await expect(page.getByRole("tooltip")).toContainText("unit counted once");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("App version", { exact: true }).check();
  await page
    .getByRole("combobox", { name: "Preview breakdown", exact: true })
    .selectOption("app_version");
  await page
    .getByRole("button", { name: "Calculate preview", exact: true })
    .click();
  await expect(
    page.getByRole("columnheader", { name: "App version", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "iOS 4.8.0", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("61.99%", { exact: true }).first()).toBeVisible();
});

for (const width of [1440, 820, 390])
  test(`simplified screens have no page overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const view of ["overview", "catalog", "metric", "validation", "api"]) {
      await page.goto("./#page=builder&builderView=" + view);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (view === "api")
        await page
          .getByRole("button", { name: "Run Query", exact: true })
          .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/simplified-${view}-${width}.png`,
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
  });
