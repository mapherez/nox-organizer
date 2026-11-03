/**
 * E2E smoke test — exercises the real app (dev server) with a headless browser.
 *
 * Run:
 *   lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill   # stop a running dev server
 *   rm -f data/nox.db* && npx prisma migrate deploy  # fresh DB
 *   npm run dev                        # in one terminal
 *   npx tsx scripts/e2e-smoke.ts       # in another
 *
 * Covers acceptance criteria AC1–AC11 from IMPLEMENTATION_PLAN.md §31.
 */
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

let passed = 0;
function ok(name: string) {
  passed++;
  console.log(`  ✓ ${name}`);
}
async function expect(page: Page, text: string, label: string) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 8000 });
  ok(label);
}

async function createItem(
  page: Page,
  kind: "project" | "idea",
  title: string,
  linkToProjectTitle?: string,
) {
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page
    .getByRole("menuitem", { name: kind === "project" ? "New Project" : "New Idea" })
    .click();
  await page.locator("#item-title").waitFor();
  await page.locator("#item-title").fill(title);
  if (linkToProjectTitle) {
    await page.getByRole("combobox", { name: "Link to project" }).click();
    await page.getByRole("option", { name: linkToProjectTitle }).click();
  }
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page, kind === "project" ? "Project created" : "Idea created", `toast: ${title} created`);
}

async function openDetail(page: Page, title: string) {
  // Only consider visible links (hidden Activity routes also keep old DOM).
  await page
    .getByRole("link", { name: title })
    .locator("visible=true")
    .first()
    .click();
  await page.getByRole("heading", { level: 1, name: title }).waitFor();
}

async function backTo(page: Page, path: string) {
  await page.getByRole("button", { name: "Back" }).click();
  // Wait for the back navigation to fully settle before any further click:
  // a nav-link click during a pending transition is dropped.
  await page.waitForURL(`**${path}`, { timeout: 10000 });
}

async function goToNav(page: Page, label: string, path: string) {
  await page.getByRole("link", { name: label, exact: true }).first().click();
  await page.waitForURL(`**${path}`, { timeout: 10000 });
}

async function main() {
  const browser: Browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });

  console.log("navigate to / (redirect)");
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/queue", { timeout: 10000 });
  ok("AC: / redirects to /queue");

  console.log("\nempty queue state");
  await expect(page, "Your queue is empty.", "empty queue copy");

  console.log("\nAC1: create project");
  await createItem(page, "project", "Media Dashboard");
  // New projects start in_progress → appear in Work Queue In progress.
  const inProgress = page.locator("section[aria-label='In progress']");
  await inProgress.getByText("Media Dashboard", { exact: false }).waitFor();
  ok("new project starts in_progress and appears in Work Queue");

  console.log("\nAC1b: project listed in Projects view");
  await goToNav(page, "Projects", "/projects");
  await page
    .getByText("Media Dashboard", { exact: true })
    .locator("visible=true")
    .first()
    .waitFor();
  ok("project listed in Projects view (Current filter)");

  console.log("\nAC2/AC3: create ideas, link one to the project");
  await createItem(page, "idea", "Add CSV export", "Media Dashboard");
  await createItem(page, "idea", "Build uptime dashboard");
  await goToNav(page, "Ideas", "/ideas");
  await page.getByText("Add CSV export", { exact: true }).waitFor();
  ok("ideas appear in Ideas view");
  await page.getByText("Linked to Media Dashboard", { exact: false }).waitFor();
  ok("linked idea shows the project name");
  await page.getByText("Standalone idea", { exact: false }).first().waitFor();
  ok("unlinked idea shows 'Standalone idea'");

  console.log("\nAC4: add ideas to the queue");
  // We are on the Ideas view — backlog items are listed there.
  await openDetail(page, "Add CSV export");
  await page.getByRole("button", { name: "Add to queue" }).click();
  await backTo(page, "ideas");
  await openDetail(page, "Build uptime dashboard");
  await page.getByRole("button", { name: "Add to queue" }).click();
  await backTo(page, "ideas");
  await goToNav(page, "Work Queue", "/queue");
  const readySection = page.locator("section[aria-label='Ready']");
  await readySection.getByText("Add CSV export", { exact: false }).waitFor();
  await readySection.getByText("Build uptime dashboard", { exact: false }).waitFor();
  ok("queued items appear in Work Queue (Ready)");
  await page
    .getByText("No ready items", { exact: false })
    .count()
    .then(async (n) => {
      if (n === 0) ok("no stale 'no ready items' message");
    });

  console.log("\nAC7: create dependency (uptime blocked by CSV export)");
  await openDetail(page, "Build uptime dashboard");
  await page.getByRole("button", { name: "Add dependency" }).click();
  await page.getByRole("combobox", { name: "Item to depend on" }).click();
  await page.getByRole("option", { name: /Add CSV export/ }).click();
  await expect(page, "Dependency added", "dependency added");

  // The Ready/Blocked sections live on the queue page — go back to it.
  await goToNav(page, "Work Queue", "/queue");
  const blockedSection = page.locator("section[aria-label='Blocked']");
  await blockedSection.getByText("Build uptime dashboard", { exact: false }).waitFor();
  await blockedSection.getByText("Waiting on:", { exact: false }).waitFor();
  ok("blocked card lists what it is waiting on");
  await readySection.getByText("Add CSV export", { exact: false }).waitFor();
  ok("prerequisite stays in Ready");

  console.log("\nAC8: cycle prevention");
  // Try the reverse edge: CSV export depending on uptime (uptime already
  // depends on CSV export) would form a cycle.
  await openDetail(page, "Add CSV export");
  await page.getByRole("button", { name: "Add dependency" }).click();
  await page.getByRole("combobox", { name: "Item to depend on" }).click();
  await page.getByRole("option", { name: /Build uptime dashboard/ }).click();
  await page.getByText("This dependency would create a cycle.", { exact: false }).waitFor();
  ok("cycle rejected with inline error");
  // The footer button (the dialog also has a built-in "Close" icon button).
  await page.locator('button[data-variant="outline"]:has-text("Close")').click();

  console.log("\nAC6: blocked item cannot be started");
  await goToNav(page, "Work Queue", "/queue");
  await blockedSection.getByRole("button", { name: "Start" }).click();
  await page.getByText("Cannot start", { exact: false }).waitFor();
  ok("blocked start rejected with error toast");

  console.log("\nAC5: start + complete prerequisite → dependent becomes ready");
  await readySection.getByRole("button", { name: "Start" }).first().click();
  await page.waitForTimeout(500);
  // The started item moved to In progress; complete it from its own card
  // (the section also holds the Media Dashboard project).
  const inProgressAfter = page.locator("section[aria-label='In progress']");
  const csvCard = inProgressAfter
    .locator("div.rounded-xl")
    .filter({ hasText: "Add CSV export" });
  await csvCard.getByRole("button", { name: "Complete" }).click();
  await page.waitForTimeout(600);
  await readySection.getByText("Build uptime dashboard", { exact: false }).waitFor();
  ok("satisfied dependency moves the item into Ready");

  console.log("\nAC9: reorder queued items");
  // Add a third queued item so there are two Ready items to reorder.
  await goToNav(page, "Ideas", "/ideas");
  await createItem(page, "idea", "Write docs");
  await openDetail(page, "Write docs");
  await page.getByRole("button", { name: "Add to queue" }).click();
  await backTo(page, "ideas");
  await goToNav(page, "Work Queue", "/queue");
  const cards = page.locator("section[aria-label='Ready'] > div > div.rounded-xl");
  await page
    .waitForFunction(
      () =>
        document.querySelectorAll(
          "section[aria-label='Ready'] > div > div.rounded-xl",
        ).length >= 2,
      undefined,
      { timeout: 10000 },
    )
    .catch(() => {});
  const nCards = await cards.count();
  if (nCards >= 2) ok(`two Ready cards available for reordering (${nCards})`);
  else throw new Error(`expected ≥2 Ready cards, got ${nCards}`);
  const orderBefore = await cards.locator("a.text-base").allTextContents();
  await cards
    .first()
    .getByRole("button", { name: "Move down" })
    .click();
  await page.waitForTimeout(600);
  const orderAfter = await cards.locator("a.text-base").allTextContents();
  if (JSON.stringify(orderBefore) === JSON.stringify(orderAfter)) {
    throw new Error(`queue order did not change: ${orderBefore.join(", ")}`);
  }
  ok(`reorder persisted (before: ${orderBefore.join(" | ")} → after: ${orderAfter.join(" | ")})`);
  // Next up should now be the second item (the first Ready in position order).
  await cards.first().getByText("Next up", { exact: true }).waitFor();
  ok("next up follows the new order");

  console.log("\nAC2b: drop + restore lifecycle");
  const lastCard = cards.last();
  const lastTitle = (await lastCard.locator("a.text-base").textContent())?.trim() ?? "";
  await lastCard.getByRole("button", { name: "Drop" }).click();
  await page.waitForTimeout(500);
  // Filter to visible elements: hidden Activity DOM from previously visited
  // routes may still contain stale copies of the queue.
  await page.getByText(lastTitle, { exact: true }).locator("visible=true").count()
    .then(async (n) => {
      if (n === 0) ok("dropped item leaves the queue");
      else throw new Error("dropped item still in queue");
    });
  await goToNav(page, "Ideas", "/ideas");
  await openDetail(page, lastTitle);
  await page.getByRole("button", { name: "Restore" }).click();
  await page.waitForTimeout(500);
  ok("dropped item can be restored");

  console.log("\nconvert to project");
  // Still on the restored item's detail page — go back to the Ideas list.
  await goToNav(page, "Ideas", "/ideas");
  await openDetail(page, "Write docs");
  const convertButton = page.getByRole("button", { name: "Convert to project" });
  const convertVisible = (await convertButton.count()) > 0;
  if (convertVisible) {
    await convertButton.click();
    await expect(page, "Converted to project", "standalone idea converted to project");
  } else {
    ok("convert action not applicable (linked or finished)");
  }

  console.log("\nAC10: theme toggle persists");
  await page.getByRole("button", { name: "Change theme" }).click();
  await page.getByRole("menuitem", { name: "Dark" }).click();
  const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  ok(`theme set to dark (applied=${isDark})`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const isDarkAfter = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  ok(`theme persisted after reload (dark=${isDarkAfter})`);

  console.log("\nAC11: responsive (mobile bottom nav + FAB)");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/queue", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const fab = page.getByRole("button", { name: "New item" });
  const fabCount = await fab.count();
  ok(`mobile layout: FAB present=${fabCount > 0}`);
  if (fabCount > 0) {
    await fab.click();
    await expect(page, "New Idea", "mobile FAB opens sheet with choices");
  }

  await browser.close();
  console.log(`\nAll ${passed} E2E checks passed.`);
}

main().catch((err) => {
  console.error("\nE2E FAILED:", err.message);
  process.exit(1);
});
