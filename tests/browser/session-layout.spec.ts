import { test, expect, type Page } from "@playwright/test";
const original =
  "#page=overview&size=all&payment=all&outcome=all&period=recent&session=S-1042-0&event=0&moment=1792672200000&record=&origin=&stage=6&compare=false&cohortA=large-split&cohortB=small-split&mode=reached";
const mainNav = (page: Page) =>
  page.getByRole("navigation", { name: "Main navigation", exact: true });
async function frame(page: Page) {
  return page.evaluate(() => {
    function metric(selector: string) {
      const el = document.querySelector<HTMLElement>(selector)!;
      const r = el.getBoundingClientRect(),
        s = getComputedStyle(el);
      return {
        x: r.x,
        width: r.width,
        ...(selector !== ".app-content" ? { height: r.height } : {}),
        font: s.fontSize,
        family: s.fontFamily,
        padding: s.padding,
      };
    }
    return {
      sidebar: metric(".sidebar"),
      content: metric(".app-content"),
      topbar: metric(".topbar"),
      brand: metric(".brand"),
      brandText: metric(".brand > span"),
      viewport: document.documentElement.clientWidth,
    };
  });
}
async function pageStyle(page: Page) {
  return page
    .locator("main > div:not([hidden]) > div")
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect(),
        s = getComputedStyle(el);
      return { x: r.x, width: r.width, padding: s.padding };
    });
}
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1200, height: 800 },
  { width: 1024, height: 768 },
  { width: 820, height: 1100 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
]) {
  test(`Session Analysis retains the shared frame and menu sizes at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("./" + original);
    await page.evaluate(() => document.fonts.ready);
    const expected = await frame(page),
      expectedPage = await pageStyle(page);
    const expectedTitle = await page
      .getByRole("heading", { name: "Group Orders.", exact: true })
      .evaluate((el) => getComputedStyle(el).fontSize);
    const expectedMenu = await mainNav(page)
      .getByRole("button", { name: "Overview", exact: true })
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          font: s.fontSize,
          family: s.fontFamily,
          padding: s.padding,
          height: el.getBoundingClientRect().height,
        };
      });
    for (const name of [
      "Session Analysis",
      "Journey Analysis",
      "Session Analysis",
    ]) {
      await mainNav(page).getByRole("button", { name, exact: true }).click();
      await expect(
        mainNav(page).getByRole("button", { name, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      expect(await frame(page)).toEqual(expected);
      expect(await pageStyle(page)).toEqual(expectedPage);
      const sizes = await mainNav(page)
        .getByRole("button")
        .evaluateAll((elements) =>
          elements.map((el) => {
            const s = getComputedStyle(el);
            return {
              font: s.fontSize,
              family: s.fontFamily,
              padding: s.padding,
              height: el.getBoundingClientRect().height,
            };
          }),
        );
      expect(sizes).toEqual([expectedMenu, expectedMenu, expectedMenu]);
      const heading = page.locator("main > div:not([hidden]) h1");
      expect(
        await heading.evaluate((el) => getComputedStyle(el).fontSize),
      ).toBe(expectedTitle);
      if (name === "Session Analysis") {
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
        const phone = await page.getByTestId("phone").boundingBox();
        expect(phone!.x).toBeGreaterThanOrEqual(expected.content.x);
        expect(phone!.x + phone!.width).toBeLessThanOrEqual(viewport.width);
      }
    }
    if (viewport.width <= 1100) {
      await page.locator(".studio-page").evaluate(async (el) => {
        await Promise.all(
          el.getAnimations().map((animation) => animation.finished),
        );
      });
      const business = await page.locator(".business-context").boundingBox();
      const evidence = await page.locator(".connected-evidence").boundingBox();
      const investigator = await page.locator(".investigator").boundingBox();
      if (viewport.width > 680) {
        expect(business!.x).toBeLessThan(evidence!.x);
        expect(evidence!.x).toBe(investigator!.x);
        expect(business!.y).toBe(evidence!.y);
      } else {
        expect(business!.x).toBe(evidence!.x);
        expect(evidence!.x).toBe(investigator!.x);
        expect(business!.y + business!.height).toBeLessThanOrEqual(evidence!.y);
      }
      expect(evidence!.y + evidence!.height).toBeLessThanOrEqual(
        investigator!.y,
      );
    }
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    expect(await frame(page)).toEqual(expected);
    expect(
      new URLSearchParams(new URL(page.url()).hash.slice(1)).get("session"),
    ).toBe("S-1042-0");
    await page.screenshot({
      path: `test-results/session-layout-${viewport.width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("navigation", { name: "Workspaces" })
      .getByRole("button", { name: "Builder Studio", exact: true })
      .click();
    expect(await frame(page)).toEqual(expected);
  });
}

test("shorter laptop windows retain the replay screen size instead of scaling it down", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("./" + original.replace("page=overview", "page=studio"));
  const phone = page.getByTestId("phone");
  const large = await phone.boundingBox();
  expect(large).not.toBeNull();
  await page.setViewportSize({ width: 1280, height: 720 });
  const small = await phone.boundingBox();
  expect(small!.width).toBeCloseTo(large!.width, 3);
  expect(small!.height).toBeCloseTo(large!.height, 3);
  await expect(phone).toHaveCSS("transform", "none");
  const panel = await page.locator(".replay-panel").boundingBox();
  expect(small!.x).toBeGreaterThanOrEqual(panel!.x);
  expect(small!.x + small!.width).toBeLessThanOrEqual(panel!.x + panel!.width);
});
