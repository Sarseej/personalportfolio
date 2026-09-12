import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(
  resolve(
    process.env.PORTFOLIO_TEST_TOOLS ||
      "/private/tmp/personalportfolio-browser-review",
    "package.json",
  ),
);
const { chromium } = require("playwright");
const { default: AxeBuilder } = require("@axe-core/playwright");
const browser = await chromium.launch({
  executablePath:
    process.env.PORTFOLIO_BROWSER ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const base = process.env.PORTFOLIO_PREVIEW_URL || "http://127.0.0.1:4173",
  output =
    process.env.PORTFOLIO_REVIEW_OUTPUT || "project-vault/review/after-hours";
mkdirSync(output, { recursive: true });
const report = { checks: [], consoleErrors: [], accessibility: [] };
async function page(options = {}) {
  const context = await browser.newContext(options),
    p = await context.newPage();
  p.on("pageerror", (e) => report.consoleErrors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") report.consoleErrors.push(m.text());
  });
  return p;
}
async function settled(p, view) {
  await p.locator(`main[data-station="${view}"]`).waitFor();
  await p.waitForTimeout(1150);
  if (view !== "home") await p.locator(".object-interface.is-ready").waitFor();
  await p.waitForTimeout(700);
}
async function nav(p, view) {
  await p.locator(`#destination-nav a[href="#${view}"]`).click();
  await settled(p, view);
}
async function axe(p, label) {
  const result = await new AxeBuilder({ page: p })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  report.accessibility.push({
    label,
    violations: result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  });
}
try {
  const p = await page({ viewport: { width: 1440, height: 900 } });
  await p.goto(base);
  await p.locator(".room-ready").waitFor();
  await settled(p, "home");
  await p.screenshot({ path: `${output}/desktop-home.png` });
  if (process.argv.includes("--capture-posters"))
    await p.screenshot({
      path: "public/atelier-poster.jpg",
      type: "jpeg",
      quality: 84,
      style:
        ".atelier-header,.entrance-copy,.workspace-footer,.station-marker,.room-vignette{visibility:hidden!important}",
    });
  if (process.argv.includes("--quick")) {
    for (const view of ["projects", "career", "cv"]) {
      await nav(p, view);
      await p.screenshot({ path: `${output}/desktop-${view}.png` });
    }
    const mobile = await page({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    await mobile.goto(base);
    await mobile.locator(".room-ready").waitFor();
    await settled(mobile, "home");
    await mobile.screenshot({ path: `${output}/mobile-home.png` });
    for (const view of ["projects", "career", "cv"]) {
      await nav(mobile, view);
      await mobile.screenshot({ path: `${output}/mobile-${view}.png` });
      await mobile.getByRole("button", { name: "Back to room" }).click();
      await settled(mobile, "home");
    }
    assert.equal(report.consoleErrors.length, 0);
    await browser.close();
    process.exit(0);
  }
  await axe(p, "desktop home");
  const home = await p.locator("canvas").getAttribute("data-camera");
  for (const view of ["projects", "career", "cv"]) {
    await p.locator(`#destination-nav a[href="#${view}"]`).hover();
    assert.equal(await p.locator(".station-marker.is-hovered").count(), 1);
    await p
      .locator(".station-marker")
      .filter({
        hasText: view === "cv" ? "CV" : view[0].toUpperCase() + view.slice(1),
      })
      .click();
    await settled(p, view);
    assert.notEqual(
      await p.locator("canvas").getAttribute("data-camera"),
      home,
    );
    assert.equal(new URL(p.url()).hash, `#${view}`);
    await p.screenshot({ path: `${output}/desktop-${view}.png` });
    await axe(p, `desktop ${view}`);
    if (view === "projects") {
      for (let i = 0; i < 4; i++) {
        await p.locator(".project-rail button").nth(i).click();
        await p.locator(".flow-stages button").nth(2).click();
        assert.equal(
          await p
            .locator(".flow-stages button")
            .nth(2)
            .getAttribute("aria-pressed"),
          "true",
        );
        await p.locator(".technical-details summary").click();
      }
      report.checks.push(
        "Four project narratives, system steps and technical expansions",
      );
    }
    if (view === "career") {
      assert.equal(await p.locator(".career-graph li").count(), 9);
      assert.match(
        await p.locator(".career-graph").innerText(),
        /Mathematics Tutor → Senior Mathematics Tutor/,
      );
      await p.locator(".career-graph button").nth(1).click();
      assert.match(
        await p.locator(".career-detail").innerText(),
        /Numerical Methods/,
      );
      assert.match(
        await p.locator(".promotion-milestone").innerText(),
        /Promoted to Senior Mathematics Tutor/,
      );
      await p.waitForTimeout(450);
      await p.screenshot({ path: `${output}/desktop-career-promotion.png` });
      await axe(p, "career promotion");
      report.checks.push(
        "Continuous tutoring role and promotion milestone in Career; verified subjects and mentoring",
      );
      await p.locator(".career-graph button").last().click();
      assert.match(await p.locator(".career-detail").innerText(), /2027/);
    }
    if (view === "cv")
      assert.match(
        await p.locator(".cv-document").innerText(),
        /Senior Mathematics Tutor/,
      );
    await p.keyboard.press("Escape");
    await settled(p, "home");
    await nav(p, view);
    await p.getByRole("button", { name: "Back to room" }).click();
    await settled(p, "home");
    report.checks.push(
      `${view}: object and navigation activation, camera, Escape and visible Back`,
    );
  }
  const { PerspectiveCamera, Vector3 } = createRequire(resolve("package.json"))(
    "three",
  );
  for (const [view, point] of Object.entries({
    projects: [-1.06, 2.14, -0.24],
    career: [1.06, 2.14, -0.24],
    cv: [-2, 1.45, 0.7],
  })) {
    const camera = new PerspectiveCamera(46, 1440 / 900, 0.1, 80);
    camera.position.set(
      ...(await p.locator("canvas").getAttribute("data-camera"))
        .split(",")
        .map(Number),
    );
    camera.lookAt(-0.5, 1.9, -1.2);
    camera.updateMatrixWorld();
    const hit = new Vector3(...point).project(camera);
    await p.mouse.click((hit.x + 1) * 720, (1 - hit.y) * 450);
    await settled(p, view);
    await p.keyboard.press("Escape");
    await settled(p, "home");
  }
  report.checks.push(
    "All three physical mesh hitboxes activate their destination",
  );
  await nav(p, "projects");
  await nav(p, "career");
  await p.goBack();
  await settled(p, "projects");
  await p.goForward();
  await settled(p, "career");
  report.checks.push("Browser Back and Forward restore destination");
  await p.evaluate(() => {
    for (const hash of ["#cv", "#projects", "#career"])
      document.querySelector(`#destination-nav a[href="${hash}"]`).click();
  });
  await settled(p, "career");
  assert.match(await p.locator("#interface-title").innerText(), /Career/);
  report.checks.push("Rapid navigation converges on final destination");
  await nav(p, "home");
  await p.locator(".station-marker").first().focus();
  await p.keyboard.press("Enter");
  await settled(p, "projects");
  await p.keyboard.press("Escape");
  await settled(p, "home");
  assert(
    await p
      .locator('#destination-nav a[href="#projects"]')
      .evaluate((el) => el === document.activeElement),
  );
  await p.locator('#destination-nav a[href="#cv"]').focus();
  await p.keyboard.press("Space");
  await settled(p, "cv");
  report.checks.push("Keyboard object Enter, navigation Space and Escape");
  await p.goto(`${base}/#career`);
  await settled(p, "career");
  assert(await p.locator(".career-graph").isVisible());
  report.checks.push("Direct hash entry");
  const tablet = await page({ viewport: { width: 1024, height: 768 } });
  await tablet.goto(base);
  await tablet.locator(".room-ready").waitFor();
  await settled(tablet, "home");
  await tablet.screenshot({ path: `${output}/tablet-home.png` });
  for (const view of ["projects", "career", "cv"]) {
    await nav(tablet, view);
    await tablet.screenshot({ path: `${output}/tablet-${view}.png` });
    const bounds = await tablet.locator(".object-interface").boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= 1024);
  }
  const mobile = await page({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await mobile.goto(base);
  await mobile.locator(".room-ready").waitFor();
  await settled(mobile, "home");
  await mobile.screenshot({ path: `${output}/mobile-home.png` });
  if (process.argv.includes("--capture-posters"))
    await mobile.screenshot({
      path: "public/atelier-poster-mobile.jpg",
      type: "jpeg",
      quality: 84,
      style:
        ".atelier-header,.entrance-copy,.workspace-footer,.station-marker,.room-vignette{visibility:hidden!important}",
    });
  for (const view of ["projects", "career", "cv"]) {
    await nav(mobile, view);
    await mobile.screenshot({ path: `${output}/mobile-${view}.png` });
    await axe(mobile, `mobile ${view}`);
    if (view === "career") {
      await mobile.locator(".career-graph button").nth(2).click();
      await mobile.waitForFunction(() => {
        const bounds = document
          .querySelector(".career-detail")
          .getBoundingClientRect();
        return bounds.y < 844 && bounds.bottom > 123;
      });
      const details = await mobile.locator(".career-detail").boundingBox();
      assert(details.y < 844 && details.y + details.height > 123);
      await mobile.locator(".timeline-return").click();
      assert(
        await mobile
          .locator(".career-graph button")
          .nth(2)
          .evaluate((el) => el === document.activeElement),
      );
    }
    assert(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  report.checks.push("1440×900, 1024×768, 390×844 room and all destinations");
  const reduced = await page({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await reduced.goto(base);
  await reduced.locator(".room-ready").waitFor();
  await settled(reduced, "home");
  await reduced.locator('#destination-nav a[href="#projects"]').click();
  await reduced.waitForTimeout(100);
  assert.equal(
    await reduced.locator("canvas").getAttribute("data-transition"),
    "settled",
  );
  await nav(reduced, "career");
  assert(
    await reduced
      .locator(".career-graph")
      .evaluate(
        (el) => getComputedStyle(el, "::before").animationName === "none",
      ),
  );
  assert(
    await reduced
      .locator(".career-graph li")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName === "none"),
  );
  report.checks.push(
    "Reduced motion uses immediate camera cut and disables timeline entry effects",
  );
  const fallback = await page({ viewport: { width: 390, height: 844 } });
  await fallback.addInitScript(() => {
    delete window.WebGL2RenderingContext;
  });
  await fallback.goto(base);
  for (const view of ["projects", "career", "cv"]) {
    await nav(fallback, view);
    assert(await fallback.locator(".object-interface").isVisible());
  }
  await fallback.screenshot({ path: `${output}/static-cv.png` });
  report.checks.push("Non-WebGL destinations remain functional");
  await p.evaluate(() =>
    document
      .querySelector("canvas")
      .dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
  );
  await nav(p, "cv");
  assert(await p.locator(".fallback-interface").isVisible());
  report.checks.push("Context loss preserves content and navigation");
  await p.getByRole("link", { name: "Print-friendly view" }).click();
  await p.locator(".standalone-cv").waitFor();
  await axe(p, "print CV");
  await p.getByRole("link", { name: /Return to workspace/ }).click();
  await settled(p, "cv");
  report.checks.push("Print-friendly static route and return to CV");
  const plain = await page({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  await plain.goto(base);
  assert.equal(await plain.locator("#projects article").count(), 4);
  assert(await plain.locator("#cv").isVisible());
  report.checks.push("No-JavaScript project, career and CV HTML");
  assert.equal(
    report.consoleErrors.length,
    0,
    JSON.stringify(report.consoleErrors),
  );
  assert(
    report.accessibility.every((item) => item.violations.length === 0),
    JSON.stringify(report.accessibility),
  );
} finally {
  writeFileSync(
    `${output}/browser-results.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
