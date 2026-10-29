import { test, expect } from "@playwright/test";
import { db } from "../../src/data";
import { groupPlayback } from "../../src/replay";
const steps = groupPlayback(db.groups.find((g) => g.id === "GO-1042")!);
test("one play follows the entire group, pauses, resumes, compares the same moment and ends cleanly", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.clock.install();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("./#page=studio&size=large&payment=split&session=S-1042-0");
  await page.getByLabel("Autoplay pace").selectOption("1000");
  const history = await page.evaluate(() => window.history.length);
  await page
    .getByRole("button", { name: "Play whole group", exact: true })
    .click();
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await expect(page.getByLabel("Whole group progress")).toHaveAttribute(
      "value",
      String(i + 1),
    );
    await expect(
      page.locator(".participant-selector button[aria-pressed=true]"),
    ).toContainText(
      db.participants.find(
        (p) =>
          p.id ===
          db.sessions.find((s) => s.id === step.sessionId)!.participantId,
      )!.name,
    );
    await expect(page.getByTestId("journey-clock")).toContainText(
      new Date(step.at).toISOString().slice(11, 19),
    );
    if (i === 4) {
      await page.getByRole("button", { name: "Pause group autoplay" }).click();
      await page.clock.runFor(5000);
      await expect(page.getByLabel("Whole group progress")).toHaveAttribute(
        "value",
        String(i + 1),
      );
      await page.getByRole("button", { name: "Resume group autoplay" }).click();
    }
    if (step.title.startsWith("Same moment")) {
      await expect(page.getByTestId("phone")).toHaveAttribute(
        "data-screen",
        "failed",
      );
      const phone = await page.getByTestId("phone").boundingBox();
      expect(phone!.y + phone!.height).toBeLessThanOrEqual(800);
      await page.screenshot({
        path: "test-results/group-autoplay.png",
        fullPage: true,
        animations: "disabled",
      });
    }
    if (i === steps.length - 1) {
      await page.getByRole("button", { name: "Pause group autoplay" }).click();
      await expect(page.getByTestId("journey-clock")).toContainText("12:32:25");
    }
    await page.clock.runFor(1000);
  }
  await expect(page.getByTestId("group-playback")).toContainText(
    "Group journey complete",
  );
  await expect(page.getByTestId("journey-clock")).toContainText("12:32:25");
  expect(await page.evaluate(() => window.history.length)).toBe(history);
  await page.getByRole("button", { name: "Replay whole group" }).click();
  await expect(page.getByTestId("journey-clock")).toContainText("12:30:00");
  await page.getByRole("button", { name: "Inspect manually" }).click();
  await expect(
    page.getByRole("button", { name: "Play replay", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("manual selection, navigation and reload stop autoplay without losing the selected moment", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("./#page=studio&size=large&payment=split&session=S-1042-0");
  await page
    .getByRole("button", { name: "Play whole group", exact: true })
    .click();
  await page.clock.runFor(2000);
  await page
    .locator(".participant-selector")
    .getByRole("button", { name: /Sam/ })
    .click();
  const clock = await page.getByTestId("journey-clock").textContent();
  await page.clock.runFor(6000);
  await expect(page.getByTestId("journey-clock")).toHaveText(clock!);
  await expect(
    page.getByRole("button", { name: "Play whole group", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Play whole group", exact: true })
    .click();
  await page.clock.runFor(2000);
  const url = page.url();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Play whole group", exact: true }),
  ).toBeVisible();
  expect(page.url()).toBe(url);
  await page
    .getByRole("button", { name: "Play whole group", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explore comparable journeys" })
    .click();
  await page.clock.runFor(10000);
  await expect(
    page.getByRole("heading", { name: "Group Order funnel" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to originating order and moment" })
    .click();
  await expect(
    page.getByRole("button", { name: "Play whole group", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Replay group").selectOption("GO-1186");
  await expect(page.getByTestId("group-playback")).toHaveCount(0);
});
