import { test, expect, type Page } from "@playwright/test";
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
});
test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});
test("shared order, all people, evidence, cohort return and copyable linked brief", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("./");
  await page.screenshot({
    path: "test-results/overview.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Investigate this journey", exact: true })
    .click();
  await expect(page.getByLabel("Replay group")).toHaveValue("GO-1042");
  await expect(page.locator(".participant-selector button")).toHaveCount(5);
  for (const name of ["Sam", "Maya", "Leo", "Jo", "Alex"]) {
    await page
      .locator(".participant-selector")
      .getByRole("button", { name: new RegExp(name) })
      .click();
    await expect(page.getByTestId("journey-clock")).toContainText(
      "12:31:38 UTC",
    );
    if (name === "Sam")
      await expect(page.getByTestId("phone")).toHaveAttribute(
        "data-screen",
        "failed",
      );
  }
  await page
    .getByRole("button", { name: /Backend.*Submission blocked/ })
    .click();
  await expect(page.getByTestId("journey-clock")).toContainText("12:31:42 UTC");
  await expect(page.getByTestId("phone")).toHaveAttribute(
    "data-screen",
    "waiting",
  );
  await expect(page.getByTestId("phone")).toContainText(
    "Sam’s payment is pending",
  );
  await page
    .locator(".participant-selector")
    .getByRole("button", { name: /Sam/ })
    .click();
  await expect(page.getByTestId("phone")).toHaveAttribute(
    "data-screen",
    "failed",
  );
  await page.getByText("Connected evidence · Sam", { exact: true }).click();
  await expect(page.locator(".connected-evidence")).toContainText("PAY-1042-1");
  await page
    .locator(".connected-evidence")
    .getByRole("button", { name: /^Authorization declined/ })
    .click();
  await expect(page.getByTestId("journey-clock")).toContainText("12:31:38 UTC");
  await page
    .getByRole("button", { name: "Investigate this journey", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recommended validation" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore comparable journeys" })
    .click();
  await expect(page.getByLabel("Group size", { exact: true })).toHaveValue(
    "large",
  );
  await expect(page.locator(".cohort-context")).toContainText("296 groups");
  await expect(page.locator(".cohort-context")).toContainText(
    "68 recorded authorization failures / 185",
  );
  await page.screenshot({
    path: "test-results/journey.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Return to originating order and moment" })
    .click();
  await expect(page.getByTestId("journey-clock")).toContainText("12:31:38 UTC");
  await expect(
    page.locator(".participant-selector button[aria-pressed=true]"),
  ).toContainText("Sam");
  await expect(
    page.getByRole("heading", { name: "Recommended validation" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/studio.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Create investigation brief", exact: true })
    .first()
    .click();
  const brief = await page
    .getByLabel("Investigation brief", { exact: true })
    .inputValue();
  expect(brief).toContain("GO-1042");
  expect(brief).toContain("Oct 15–28, 2026");
  expect(brief).toContain("111/296");
  await page.getByRole("button", { name: "Copy brief", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(brief);
  await page.keyboard.press("Escape");
  const links = brief.match(/http[^\s]+/g)!;
  for (const link of links) {
    await page.goto(link);
    const params = new URLSearchParams(new URL(link).hash.slice(1));
    if (params.get("page") === "studio") {
      await expect(page.getByTestId("phone")).toBeVisible();
      await expect(
        page.locator(".timeline-event[aria-pressed=true]"),
      ).toHaveAttribute("data-event-id", params.get("record")!);
      expect(
        new URLSearchParams(new URL(page.url()).hash.slice(1)).get("moment"),
      ).toBe(params.get("moment"));
    } else
      await expect(
        page.getByRole("heading", { name: "Group Order funnel" }),
      ).toBeVisible();
  }
  await page.goto("./#page=studio&session=S-1042-0&size=large&payment=split");
  await page
    .getByRole("button", {
      name: /Run investigation again|Investigate this journey/,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Observed evidence" }),
  ).toBeVisible();
  await page.getByLabel("Replay group").selectOption("GO-1186");
  await expect(
    page.getByRole("heading", { name: "Observed evidence" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Create investigation brief" }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("comparison definitions persist, shareable clock and browser history", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("./");
  await page.getByRole("button", { name: "Explore this comparison" }).click();
  await expect(page.getByLabel("Comparison cohort A")).toHaveValue(
    "large-split",
  );
  await expect(page.getByLabel("Comparison cohort B")).toHaveValue(
    "small-split",
  );
  await page.getByLabel("Comparison cohort A").selectOption("single");
  await page.getByLabel("Comparison cohort B").selectOption("completed");
  await page.reload();
  await expect(page.getByLabel("Comparison cohort A")).toHaveValue("single");
  await expect(page.getByLabel("Comparison cohort B")).toHaveValue("completed");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("button", { name: "Investigate this journey", exact: true })
    .click();
  await page.getByLabel("Event type").selectOption("Outcome");
  await expect(
    page.getByText("Playback still follows all events.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.locator(".timeline-event[aria-pressed=true]"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next event", exact: true }).click();
  const clock = await page.getByTestId("journey-clock").textContent();
  await page.reload();
  await expect(page.getByTestId("journey-clock")).toHaveText(clock!);
  await page
    .getByRole("button", { name: "Copy replay link", exact: true })
    .click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  await page.goto(link);
  await expect(page.getByTestId("journey-clock")).toHaveText(clock!);
  const before = await page.evaluate(() => history.length);
  await page.getByRole("button", { name: "Play replay", exact: true }).click();
  await expect
    .poll(() => page.getByTestId("journey-clock").textContent())
    .not.toBe(clock);
  await page.getByRole("button", { name: "Pause replay", exact: true }).click();
  expect(await page.evaluate(() => history.length)).toBe(before);
  const held = await page.getByTestId("journey-clock").textContent();
  await page
    .getByRole("button", { name: "Explore comparable journeys" })
    .click();
  await page
    .getByRole("button", { name: "Compare segments", exact: true })
    .click();
  await expect(page.getByLabel("Comparison cohort A")).toHaveValue("single");
  await page.goBack();
  await expect(page.getByTestId("journey-clock")).toHaveText(held!);
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "Group Order funnel" }),
  ).toBeVisible();
});

test("all curated members, time boundaries, replay controls and narrow layout", async ({
  page,
}) => {
  await page.goto("./#page=studio&session=S-1042-0&event=1");
  await expect(page.getByTestId("journey-clock")).toContainText("12:30:12");
  await expect(page.getByTestId("phone")).toContainText("1 joined");
  await page
    .locator(".participant-selector")
    .getByRole("button", { name: /Sam/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Session has not started." }),
  ).toBeVisible();
  await page.getByLabel("Replay timeline").fill("140");
  await page
    .locator(".participant-selector")
    .getByRole("button", { name: /Maya/ })
    .click();
  await expect(
    page.getByText(/Session ended; last recorded state shown/),
  ).toBeVisible();
  for (const [id, members] of [
    ["GO-1042", 5],
    ["GO-1096", 5],
    ["GO-1128", 5],
    ["GO-1186", 5],
    ["GO-1234", 3],
  ] as const) {
    await page.getByLabel("Replay group").selectOption(id);
    await page.getByLabel("Replay timeline").fill("120");
    await expect(page.locator(".participant-selector button")).toHaveCount(
      members,
    );
    for (let i = 0; i < members; i++) {
      await page.locator(".participant-selector button").nth(i).click();
      await expect(page.getByTestId("phone")).toBeVisible();
      await expect(page.getByTestId("journey-clock")).toContainText("12:32:00");
      if (id === "GO-1186" || id === "GO-1234")
        await expect(page.getByTestId("phone")).toHaveAttribute(
          "data-screen",
          "success",
        );
    }
  }
  await page.goto("./#page=studio&session=S-1042-0&event=6");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/shared-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(
      page.getByRole("button", { name: "Play replay", exact: true }),
    ).toBeVisible();
  }
  await page.goto("./#page=studio&session=S-1000-0");
  await expect(
    page.getByRole("heading", {
      name: "No detailed replay matches this cohort",
    }),
  ).toBeVisible();
  await page.goto("./#page=studio&session=missing&moment=Infinity");
  await expect(
    page.getByRole("heading", {
      name: "No detailed replay matches this cohort",
    }),
  ).toBeVisible();
});

test("all funnel stages and filters, keyboard navigation and accessible narrow controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./#page=journey&stage=0");
  for (const period of ["recent", "previous", "all"]) {
    await page.getByLabel("Analysis period").selectOption(period);
    for (const stage of [
      "Group created",
      "Invitation shared",
      "Participant joined",
      "Items added",
      "Checkout opened",
      "Submission attempted",
      "Order confirmed",
    ]) {
      const button = page.getByRole("button", {
        name: new RegExp(`^${stage}:`),
      });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: /^Reached/ }).click();
    }
  }
  for (const [label, values] of [
    ["Group size", ["small", "large", "all"]],
    ["Payment type", ["split", "single", "all"]],
    ["Order outcome", ["completed", "abandoned", "all"]],
  ] as const) {
    for (const value of values) {
      await page.getByLabel(label, { exact: true }).selectOption(value);
      await page.reload();
      await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
    }
  }
  await page.getByRole("button", { name: "Reset cohort filters" }).click();
  await expect(page.getByLabel("Analysis period")).toHaveValue("recent");
  await page.setViewportSize({ width: 390, height: 844 });
  const overview = page.getByRole("button", { name: "Overview", exact: true });
  await overview.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Group Orders." }),
  ).toBeVisible();
  const architecture = page
    .getByRole("button", { name: "How THREAD works", exact: true })
    .last();
  await architecture.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("No Grab integration");
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(architecture).toBeFocused();
  await page.goto("./#page=journey&stage=NaN&cohortA=invalid&compare=true");
  await expect(page.getByLabel("Comparison cohort A")).toHaveValue(
    "large-split",
  );
  expect(errors).toEqual([]);
});
