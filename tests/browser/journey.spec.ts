import { test, expect } from "@playwright/test";
test("filters, comparison, empty replay cohorts, successful session, architecture and narrow layout", async ({
  page,
}) => {
  await page.goto("./#page=journey");
  const old = await page
    .getByRole("button", { name: /Group created:/ })
    .getAttribute("aria-label");
  await page.getByLabel("Group size", { exact: true }).selectOption("small");
  await page.getByLabel("Payment type").selectOption("single");
  expect(
    await page
      .getByRole("button", { name: /Group created:/ })
      .getAttribute("aria-label"),
  ).not.toBe(old);
  await page.getByRole("button", { name: /Order confirmed:/ }).click();
  await expect(
    page.locator(".journey").getByText("GO-1234", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open replay" }).click();
  await page.getByRole("button", { name: /Outcome.*Order confirmed/ }).click();
  await expect(page.getByTestId("phone")).toHaveAttribute(
    "data-screen",
    "success",
  );
  await expect(page.getByText("1 authorized", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "How THREAD works", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Follow the thread." }),
  ).toBeVisible();
  await page.getByText("Semantic layer", { exact: true }).click();
  await expect(page.getByText(/Completion = distinct confirmed/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Journey Analysis", exact: true })
    .first()
    .click();
  await page.getByLabel("Analysis period").selectOption("previous");
  await page.getByRole("button", { name: /Checkout opened:/ }).click();
  await expect(
    page.getByRole("heading", { name: "No detailed replay in this selection" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Investigation Studio", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "No detailed replay matches this cohort",
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./#page=studio&size=large&payment=split&session=S-1042-1");
  await expect(page.getByTestId("phone")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/mobile-studio.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("all investigator prompts, repeated evidence seeks and alternate replay outcomes", async ({
  page,
}) => {
  await page.goto("./#page=studio&size=large&payment=split&session=S-1042-0");
  const observed = [];
  for (const question of ["0", "1", "2"]) {
    await page.getByLabel("Investigation question").selectOption(question);
    await page
      .getByRole("button", { name: "Investigate this journey" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Observed evidence", exact: true }),
    ).toBeVisible();
    observed.push(await page.locator(".finding").first().textContent());
    await expect(
      page.getByRole("heading", { name: "Hypothesis", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Missing evidence", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Recommended validation",
        exact: true,
      }),
    ).toBeVisible();
  }
  expect(new Set(observed).size).toBe(3);
  await page.getByRole("button", { name: /04 Authorization declined/ }).click();
  await expect(page.getByTestId("phone")).toHaveAttribute(
    "data-screen",
    "failed",
  );
  await page.getByLabel("Replay timeline").fill("0");
  await page.getByRole("button", { name: /04 Authorization declined/ }).click();
  await expect(page.getByTestId("phone")).toHaveAttribute(
    "data-screen",
    "failed",
  );
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const panel = document.querySelector(".context-panel");
    if (panel) panel.scrollTop = 320;
  });
  await page.screenshot({
    path: "test-results/investigation.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: /02 Compare affected segments/ })
    .click();
  await expect(page.getByLabel("Comparison cohort A")).toBeVisible();
  await page.goto("./#page=studio&size=large&payment=split&session=S-1096-0");
  await page
    .getByRole("button", { name: /Backend.*Group deadline expires/ })
    .click();
  await expect(page.getByTestId("phone")).toHaveAttribute(
    "data-screen",
    "expired",
  );
  await expect(page.getByText("Not created", { exact: true })).toBeVisible();
  await expect(page.getByText("Not attempted", { exact: true })).toBeVisible();
  await page.getByLabel("Replay group").selectOption("GO-1128");
  await page
    .getByRole("button", { name: /Interaction.*Reopen payment explanation/ })
    .click();
  await expect(page.getByTestId("phone")).toHaveAttribute(
    "data-screen",
    "confused",
  );
  await page.getByLabel("Event type").selectOption("Outcome");
  await expect(page.locator(".timeline-event")).toHaveCount(2);
  await page.getByRole("button", { name: /Outcome.*Leave checkout/ }).click();
  await expect(page.getByTestId("phone")).toHaveAttribute(
    "data-screen",
    "confused",
  );
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByLabel("Event type").selectOption("all");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/laptop.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1280);
  await page.goto("./#page=journey&stage=0");
  await expect(
    page.getByRole("button", { name: /Group created:/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Group created:/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("terminal funnel selection and outcome filters survive refresh and replay navigation", async ({
  page,
}) => {
  await page.goto("./#page=journey&stage=6&size=small&payment=single");
  await expect(page.getByRole("button", { name: /Reached/ })).toHaveClass(
    "active",
  );
  await expect(
    page.locator(".journey").getByText("GO-1234", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Order outcome").selectOption("completed");
  await expect(
    page.getByRole("button", { name: /Abandoned \(0\)/ }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("Order outcome")).toHaveValue("completed");
  await page.getByRole("button", { name: "Open replay" }).click();
  await page
    .getByRole("button", { name: "Journey Analysis", exact: true })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /Reached/ })).toHaveClass(
    "active",
  );
  await expect(
    page.locator(".journey").getByText("GO-1234", { exact: true }),
  ).toBeVisible();
});
