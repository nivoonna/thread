import { test, expect } from "@playwright/test";
const original =
  "#page=studio&size=all&payment=all&outcome=all&period=recent&session=S-1042-0&event=0&moment=1792672200000&record=&origin=&stage=6&compare=false&cohortA=large-split&cohortB=small-split&mode=reached";
test("golden measurement journey recovers validation, publishes, queries and preserves investigation", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./" + original);
  await page
    .getByRole("navigation", { name: "Workspaces", exact: true })
    .getByRole("button", { name: "Builder Studio", exact: true })
    .click();
  await page.getByRole("button", { name: "Find Group Orders data" }).click();
  await page.getByLabel("Search assets").fill("group_orders");
  await page.getByRole("button", { name: "group_orders", exact: true }).click();
  await page
    .getByRole("button", { name: "Create new version", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Modeled source")).toHaveValue("group_orders");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Calculate preview" }).click();
  await expect(
    page.getByText(/matching \/ .*eligible · distinct/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Validate draft", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish version", exact: true }),
  ).toBeDisabled();
  await page.getByText("Demo checks", { exact: true }).click();
  await page
    .getByRole("button", { name: "Test legacy field reference" })
    .click();
  await page
    .getByRole("button", { name: "Run validation", exact: true })
    .click();
  await expect(page.getByText("Blocking", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish version", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Use completed field" }).click();
  await page
    .getByRole("button", { name: "Run validation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish version", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Publish version", exact: true })
    .click();
  await expect(
    page.getByText(/Published v2. Immutable snapshot/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Data Catalog", exact: true }).click();
  await page.getByLabel("Search assets").fill("group_order_completion_rate");
  await page
    .getByRole("button", { name: "group_order_completion_rate", exact: true })
    .click();
  await expect(
    page.getByText("v1 Published, v2 Published", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use existing metric" }).click();
  await expect(
    page.getByRole("combobox", { name: "Version", exact: true }),
  ).toHaveValue("2");
  await page.getByRole("button", { name: "Run Query", exact: true }).click();
  await expect(page.getByLabel("API response")).toContainText('"version": 2');
  await page.getByText("Request and response", { exact: true }).click();
  await page.getByRole("button", { name: "Copy request", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("/v1/metrics/group_order_completion_rate/query?version=2");
  await page
    .getByRole("button", { name: "Copy response", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('"version": 2');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/builder-api.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Investigate this cohort", exact: true })
    .click();
  await expect(page).toHaveURL(/page=journey/);
  for (const [k, v] of new URLSearchParams(original.slice(1)))
    if (k !== "page")
      expect(
        new URLSearchParams(new URL(page.url()).hash.slice(1)).get(k),
      ).toBe(v);
  await page
    .getByRole("navigation", { name: "Workspaces", exact: true })
    .getByRole("button", { name: "Builder Studio", exact: true })
    .click();
  await page
    .getByRole("button", { name: "API Playground", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Version", exact: true }),
  ).toHaveValue("2");
  expect(errors).toEqual([]);
});
test("builder routes refresh, history, keyboard help, errors and tablet layout", async ({
  page,
}) => {
  for (const view of ["overview", "catalog", "metric", "validation", "api"]) {
    await page.goto("./#page=builder&builderView=" + view);
    await page.reload();
    await expect(
      page.getByRole("navigation", { name: "Builder navigation" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    page
      .getByRole("combobox", { name: "Version", exact: true })
      .locator("option"),
  ).not.toContainText(["v999"]);
  await expect(
    page
      .getByRole("combobox", { name: "Group by", exact: true })
      .locator("option"),
  ).not.toContainText(["unsupported"]);
  await page.getByText("Demo checks", { exact: true }).click();
  await page
    .getByRole("button", { name: "Test missing version", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "METRIC_VERSION_NOT_FOUND",
  );
  await expect(
    page.getByRole("combobox", { name: "Version", exact: true }),
  ).toHaveValue("1");
  await page
    .getByRole("button", { name: "Test unsupported dimension", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("UNSUPPORTED_DIMENSION");
  await expect(
    page.getByRole("combobox", { name: "Group by", exact: true }),
  ).toHaveValue("");
  await page.getByLabel("Consumer authorized (simulated)").uncheck();
  await page.getByRole("button", { name: "Run Query", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("UNAUTHORIZED");
  await page.getByRole("button", { name: "Data Catalog", exact: true }).click();
  await page.getByLabel("Search assets").fill("no-such-asset");
  await expect(page.getByRole("status")).toContainText("No assets");
  await page.getByLabel("Search assets").fill("");
  const help = page.getByLabel("About certified assets");
  await help.focus();
  await expect(
    page.getByRole("tooltip").filter({ hasText: "reviewed definition" }),
  ).toBeVisible();
  await help.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Metric Builder", exact: true })
    .click();
  await page.goBack();
  await expect(page).toHaveURL(/builderView=catalog/);
  await page.goForward();
  await expect(page).toHaveURL(/builderView=metric/);
  await page.setViewportSize({ width: 820, height: 1100 });
  await page.getByRole("button", { name: "Data Catalog", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/builder-catalog-tablet.png",
    fullPage: true,
  });
});

test("published edit creates a new immutable version with impact and deprecation", async ({
  page,
}) => {
  await page.goto("./#page=builder&builderView=validation");
  await page
    .getByRole("button", { name: "New draft from v1", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Creation cohort", exact: true })
    .selectOption("all");
  await page
    .getByRole("button", { name: "Validate draft", exact: true })
    .click();
  await expect(
    page.getByText("Potentially breaking: window", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Affected consumers remain pinned to v1: Product dashboard/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Run validation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publish version", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Deprecate v1", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("dialog", { name: "Deprecate v1?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm deprecation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Query published metric", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Version", exact: true })
    .selectOption("1");
  await page.getByRole("button", { name: "Run Query", exact: true }).click();
  await expect(page.getByLabel("API response")).toContainText(
    '"lifecycle": "Deprecated"',
  );
  await expect(page.getByLabel("API response")).toContainText(
    '"denominator": 755',
  );
});

for (const scenario of [
  {
    source: "group_order_completion_rate",
    published: "group_order_completion_rate",
    version: "2",
    stale: "payment_failure_rate",
  },
  {
    source: "payment_failure_rate",
    published: "payment_failure_rate",
    version: "2",
    stale: "group_order_completion_rate",
  },
  {
    source: "group_order_completion_rate",
    published: "renamed_completion_rate",
    version: "1",
    stale: "payment_failure_rate",
  },
]) {
  test(`publish handoff pins ${scenario.published} and its exact version`, async ({
    page,
  }) => {
    await page.goto("./#page=builder&builderView=catalog");
    await page
      .getByRole("button", { name: scenario.stale, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Use existing metric", exact: true })
      .click();
    await page.getByRole("button", { name: "Run Query", exact: true }).click();
    await expect(page.getByLabel("API response")).toContainText(
      `"metric_id": "${scenario.stale}"`,
    );
    await page
      .getByRole("button", { name: "Validation & Publishing", exact: true })
      .click();
    await page
      .getByRole("row")
      .filter({ hasText: scenario.source })
      .getByRole("button", { name: "New draft from v1", exact: true })
      .click();
    if (scenario.published !== scenario.source) {
      await page
        .getByText("Identifier and technical ownership", { exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Machine identifier", exact: true })
        .fill(scenario.published);
    }
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByRole("button", { name: "Calculate preview", exact: true })
      .click();
    if (scenario.source === "payment_failure_rate") {
      await expect(
        page.getByRole("columnheader", {
          name: "Groups with declined payment",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Completed", exact: true }),
      ).toHaveCount(0);
    } else
      await expect(
        page.getByRole("columnheader", { name: "Completed", exact: true }),
      ).toBeVisible();
    await page
      .getByRole("button", { name: "Validate draft", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Run validation", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Publish version", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      `Published v${scenario.version}.`,
    );
    await page
      .getByRole("button", { name: "Query published metric", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Metric", exact: true }),
    ).toHaveValue(scenario.published);
    await expect(
      page.getByRole("combobox", { name: "Version", exact: true }),
    ).toHaveValue(scenario.version);
    await expect(page.getByLabel("API request")).toContainText(
      `/v1/metrics/${scenario.published}/query?version=${scenario.version}`,
    );
    await expect(page.getByLabel("API response")).toHaveCount(0);
    await page.getByRole("button", { name: "Run Query", exact: true }).click();
    await expect(page.getByLabel("API response")).toContainText(
      `"metric_id": "${scenario.published}"`,
    );
    await expect(page.getByLabel("API response")).toContainText(
      `"version": ${scenario.version}`,
    );
  });
}

test("editing v1 after v2 compares and queries v1 with its pinned consumers", async ({
  page,
}) => {
  await page.goto("./#page=builder&builderView=validation");
  await page
    .getByRole("row")
    .filter({ hasText: "group_order_completion_rate" })
    .getByRole("button", { name: "New draft from v1", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Creation cohort", exact: true })
    .selectOption("all");
  await page
    .getByRole("button", { name: "Validate draft", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run validation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publish version", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Published v2.");
  await page
    .getByRole("row")
    .filter({ hasText: "group_order_completion_rate" })
    .getByRole("button", { name: "New draft from v1", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Business definition", exact: true })
    .fill("A metadata-only revision of the original completion contract.");
  await page
    .getByRole("button", { name: "Validate draft", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Change impact vs v1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Calculation contract unchanged. Metadata-only revision.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Affected consumers remain pinned to v1: Product dashboard, Internal AI agent, Thread investigation",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Query published metric", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Version", exact: true }),
  ).toHaveValue("1");
  await page.getByRole("button", { name: "Run Query", exact: true }).click();
  await expect(page.getByLabel("API response")).toContainText(
    '"denominator": 755',
  );
});
