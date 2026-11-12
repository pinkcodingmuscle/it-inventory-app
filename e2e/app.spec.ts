import { expect, test, type Page } from "@playwright/test";

// Drives the app in a browser. There is no sign-in: every page opens directly.
// Run it against a throwaway database (see e2e/README.md), never production.

// Unique names so reruns don't collide with earlier runs' leftovers.
const run = Date.now().toString(36);

/** Opens the app and waits until the first page has loaded. */
async function open(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Inventory" }).or(page.getByRole("button", { name: "Open menu" })).first()).toBeVisible();
  // The first load after the API starts can be slow; allow for it.
  await expect(page.getByText("Loading…")).toHaveCount(0, { timeout: 30_000 });
}

/** Fails the test on any uncaught page error or console error. */
function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

const dialog = (page: Page) => page.getByRole("dialog");
const row = (page: Page, text: string) => page.locator("tbody tr", { hasText: text });

test("opens straight to the Dashboard with no sign-in", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/inventory");
  await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe("managing inventory", () => {
  test.beforeEach(async ({ page }) => open(page));

  test("adds an item, checks some out, sees the history, edits it, and removes it", async ({ page }) => {
    const errors = watchConsole(page);
    const name = `E2E Widget ${run}`;
    await page.goto("/inventory");
    await page.getByRole("button", { name: "Add Item" }).click();
    await dialog(page).getByLabel("Name *").fill(name);
    await dialog(page).getByLabel("Category *").fill("E2E");
    await dialog(page).getByLabel("Unit price").fill("2.5");
    await dialog(page).getByLabel("Starting quantity").fill("5");
    await dialog(page).getByRole("button", { name: "Add to Inventory" }).click();
    await expect(dialog(page)).toHaveCount(0);

    await page.getByLabel("Search inventory").fill(name);
    await expect(row(page, name)).toHaveCount(1);
    await row(page, name).getByRole("button", { name: "Check out" }).click();
    await dialog(page).getByLabel("Quantity to check out").fill("2");
    await dialog(page).getByLabel("Notes").fill("e2e checkout");
    await dialog(page).getByRole("button", { name: "Check Out" }).click();
    await expect(row(page, name).locator("td").nth(3)).toHaveText("3"); // available

    await row(page, name).getByRole("button", { name: `History of ${name}` }).click();
    await expect(dialog(page)).toContainText("Checked out");
    await expect(dialog(page)).toContainText("e2e checkout");
    await expect(dialog(page)).toContainText("Initial stock");
    await dialog(page).getByRole("button", { name: "Close" }).last().click();

    await row(page, name).getByRole("button", { name: `Edit ${name}` }).click();
    await dialog(page).getByLabel("Reorder point (all locations)").fill("10");
    await dialog(page).getByRole("button", { name: "Save" }).click();
    await expect(row(page, name)).toContainText("Low");

    // Removing needs a quantity of 0: return, recount, then remove.
    await row(page, name).getByRole("button", { name: "Return" }).click();
    await dialog(page).getByLabel("Quantity to return").fill("2");
    await dialog(page).getByRole("button", { name: "Return" }).click();
    await row(page, name).getByRole("button", { name: "Adjust" }).click();
    await dialog(page).getByLabel(/New total quantity/).fill("0");
    await dialog(page).getByRole("button", { name: "Save Count" }).click();
    await row(page, name).getByRole("button", { name: `Edit ${name}` }).click();
    await dialog(page).getByRole("button", { name: /Remove from/ }).click();
    await dialog(page).getByRole("button", { name: "Remove", exact: true }).click();
    await expect(row(page, name)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("the old Consumables link opens Inventory filtered to consumables", async ({ page }) => {
    await page.goto("/consumables");
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
    await expect(page.getByLabel("Type")).toHaveValue("consumable");
  });

  test("adds, edits and deletes a vendor and a location", async ({ page }) => {
    const errors = watchConsole(page);
    const vendor = `E2E Vendor ${run}`;
    await page.goto("/vendors");
    await page.getByRole("button", { name: "Add Vendor" }).click();
    await dialog(page).getByLabel("Vendor name *").fill(vendor);
    await dialog(page).getByRole("button", { name: "Add Vendor" }).click();
    await row(page, vendor).getByRole("button", { name: `Edit ${vendor}` }).click();
    await dialog(page).getByLabel("Phone").fill("555-0100");
    await dialog(page).getByRole("button", { name: "Save" }).click();
    await expect(row(page, vendor)).toContainText("555-0100");
    await row(page, vendor).getByRole("button", { name: `Edit ${vendor}` }).click();
    await dialog(page).getByRole("button", { name: "Delete" }).click();
    await dialog(page).getByRole("button", { name: "Delete" }).click();
    await expect(row(page, vendor)).toHaveCount(0);

    const location = `E2E Room ${run}`;
    await page.goto("/locations");
    await page.getByRole("button", { name: "Add Location" }).click();
    await dialog(page).getByLabel("Name *").fill(location);
    await dialog(page).getByLabel("Type").selectOption("office");
    await dialog(page).getByRole("button", { name: "Add Location" }).click();
    await expect(row(page, location)).toContainText("Office");
    await row(page, location).getByRole("button", { name: `Edit ${location}` }).click();
    await dialog(page).getByLabel("Type").selectOption("storage");
    await dialog(page).getByRole("button", { name: "Save" }).click();
    await expect(row(page, location)).toContainText("Storage");
    await row(page, location).getByRole("button", { name: `Edit ${location}` }).click();
    await dialog(page).getByRole("button", { name: "Delete" }).click();
    await dialog(page).getByRole("button", { name: "Delete" }).click();
    await expect(row(page, location)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("creates a purchase order with cents, receives it, and cancels another", async ({ page }) => {
    const errors = watchConsole(page);
    const vendor = `E2E Supplier ${run}`;
    const item = `E2E Toner ${run}`;
    await page.goto("/vendors");
    await page.getByRole("button", { name: "Add Vendor" }).click();
    await dialog(page).getByLabel("Vendor name *").fill(vendor);
    await dialog(page).getByRole("button", { name: "Add Vendor" }).click();
    await page.goto("/inventory");
    await page.getByRole("button", { name: "Add Item" }).click();
    await dialog(page).getByLabel("Name *").fill(item);
    await dialog(page).getByLabel("Category *").fill("E2E");
    await dialog(page).getByRole("button", { name: "Add to Inventory" }).click();
    await expect(dialog(page)).toHaveCount(0);

    for (const po of [`PO-E2E-${run}-A`, `PO-E2E-${run}-B`]) {
      await page.goto("/purchases");
      await page.getByRole("button", { name: "New Purchase Order" }).click();
      await dialog(page).getByLabel("PO number *").fill(po);
      await dialog(page).getByLabel("Vendor *").selectOption({ label: vendor });
      await dialog(page).getByLabel("Item", { exact: true }).selectOption({ label: item });
      await dialog(page).getByLabel("Quantity").fill("3");
      await dialog(page).getByLabel("Unit price").fill("23.50");
      await expect(dialog(page)).toContainText(/Total: \D?70\.50/);
      await dialog(page).getByRole("button", { name: "Create Purchase Order" }).click();
      await expect(row(page, po)).toContainText("70.50");
    }

    await row(page, `PO-E2E-${run}-A`).getByRole("button", { name: "Receive" }).click();
    await dialog(page).getByRole("button", { name: "Receive Items" }).click();
    await expect(row(page, `PO-E2E-${run}-A`)).toContainText("Received");

    page.once("dialog", (d) => d.accept());
    await row(page, `PO-E2E-${run}-B`).getByRole("button", { name: "Cancel" }).click();
    await expect(row(page, `PO-E2E-${run}-B`)).toContainText("Cancelled");
    expect(errors).toEqual([]);
  });

  test("settings are saved on the server", async ({ page, browser }) => {
    const errors = watchConsole(page);
    const email = `support-${run}@example.com`;
    await page.goto("/settings");
    await page.getByPlaceholder("e.g. it-help@yourcompany.com").fill(email);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("status")).toHaveText("Settings saved for everyone.");

    // A completely separate browser session sees the same value.
    const other = await browser.newPage();
    await open(other);
    await other.goto("/settings");
    await expect(other.getByPlaceholder("e.g. it-help@yourcompany.com")).toHaveValue(email);
    await other.close();
    expect(errors).toEqual([]);
  });

  test("the stock movement report downloads from the server", async ({ page }) => {
    await page.goto("/reports");
    const card = page.locator("div.rounded-xl", { hasText: "Stock Movement Report" });
    const download = page.waitForEvent("download");
    await card.getByRole("button", { name: "Generate Report" }).click();
    expect((await download).suggestedFilename()).toMatch(/^stock-movement-/);
    await expect(card).toContainText(/Downloaded \d+ rows?/);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("every page fits the screen and the menu opens as a drawer", async ({ page }) => {
    await open(page);
    for (const path of ["/", "/inventory", "/purchases", "/vendors", "/locations", "/reports", "/settings"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `horizontal page scroll on ${path}`).toBeLessThanOrEqual(0);
    }
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("link", { name: "Vendors" }).click();
    await expect(page).toHaveURL(/\/vendors$/);
    await expect(page.getByRole("button", { name: "Close menu" })).not.toBeInViewport();
  });
});
