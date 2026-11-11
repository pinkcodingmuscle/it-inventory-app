import { expect, test, type Page } from "@playwright/test";

// Credentials for two users in the throwaway test database (see e2e/README.md).
const admin = { email: process.env.E2E_ADMIN_EMAIL ?? "", password: process.env.E2E_ADMIN_PASSWORD ?? "" };
const tech = { email: process.env.E2E_TECH_EMAIL ?? "", password: process.env.E2E_TECH_PASSWORD ?? "" };

test.skip(!admin.email || !admin.password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (see e2e/README.md)");

// Unique names so reruns don't collide with earlier runs' leftovers.
const run = Date.now().toString(36);

async function signIn(page: Page, who = admin) {
  await page.goto("/");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // The account button only exists once signed in (the page title is hidden on phones).
  await expect(page.getByRole("button", { name: /^Account:/ })).toBeVisible();
}

/** Fails the test on any uncaught page error or console error. */
function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // Rejected sign-ins (401 wrong password, 403 awaiting approval) are expected network errors.
    if (m.type() === "error" && !/40[13] \((Unauthorized|Forbidden)\)/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

const dialog = (page: Page) => page.getByRole("dialog");
const row = (page: Page, text: string) => page.locator("tbody tr", { hasText: text });

test.describe("signing in", () => {
  test("rejects a wrong password, then signs in, survives a reload, and signs out", async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto("/inventory");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await page.getByLabel("Email").fill(admin.email);
    await page.getByLabel("Password").fill("definitely wrong");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toContainText("Incorrect email or password");

    await page.getByLabel("Password").fill(admin.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();

    await page.getByRole("button", { name: /^Account:/ }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("signing up", () => {
  test("a new person requests an account, waits, is approved from the bell, then signs in", async ({ page, browser }) => {
    const errors = watchConsole(page);
    const email = `newcomer-${run}@example.com`;
    const declined = `declined-${run}@example.com`;

    // Two people request accounts.
    for (const who of [email, declined]) {
      await page.goto("/");
      await page.getByRole("tab", { name: "Create account" }).click();
      await page.getByLabel("Full name").fill(`Newcomer ${who}`);
      await page.getByLabel("Email").fill(who);
      await page.getByLabel("Password", { exact: true }).fill("newcomer-password");
      await page.getByLabel("Repeat password").fill("newcomer-password");
      await page.getByRole("button", { name: "Request account" }).click();
      await expect(page.getByRole("status")).toContainText("An administrator needs to approve your account");
    }

    // Signing in before approval explains why it doesn't work.
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("newcomer-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toContainText("waiting for an administrator");

    // The administrator sees the requests from the bell, approves one and declines the other.
    const adminPage = await browser.newPage();
    await signIn(adminPage);
    await adminPage.getByRole("button", { name: /^Alerts/ }).click();
    await adminPage.getByRole("button", { name: /sign-up requests? to approve/ }).click();
    await expect(adminPage.getByText(/sign-up requests? waiting for approval/)).toBeVisible();
    const request = adminPage.locator("li", { hasText: email });
    await request.getByLabel(/^Role for/).selectOption("Tech Support");
    await request.getByRole("button", { name: "Approve" }).click();
    await expect(adminPage.locator("tbody tr", { hasText: email })).toContainText("Tech Support");
    adminPage.once("dialog", (d) => d.accept());
    await adminPage.locator("li", { hasText: declined }).getByRole("button", { name: "Decline" }).click();
    await expect(adminPage.getByText(declined)).toHaveCount(0);
    await adminPage.close();

    // Now the approved person can sign in, with technician access.
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("button", { name: /^Account:/ })).toBeVisible();
    await page.goto("/inventory");
    await expect(page.getByRole("button", { name: "Add Item" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Check out" }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("as an administrator", () => {
  test.beforeEach(async ({ page }) => signIn(page));

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
    await signIn(other);
    await other.goto("/settings");
    await expect(other.getByPlaceholder("e.g. it-help@yourcompany.com")).toHaveValue(email);
    await other.close();
    expect(errors).toEqual([]);
  });

  test("an administrator adds a user who can then sign in", async ({ page, browser }) => {
    const errors = watchConsole(page);
    const email = `viewer-${run}@example.com`;
    await page.goto("/settings");
    await page.getByRole("button", { name: "Add User" }).click();
    await dialog(page).getByLabel("Name *").fill(`E2E Viewer ${run}`);
    await dialog(page).getByLabel("Email *").fill(email);
    await dialog(page).getByLabel("Role").selectOption("Viewer");
    await dialog(page).getByLabel("Password").fill("viewer-password");
    await dialog(page).getByRole("button", { name: "Add User" }).click();
    await expect(row(page, email)).toContainText("Can sign in");

    const other = await browser.newPage();
    await signIn(other, { email, password: "viewer-password" });
    // A read-only user sees data but none of the buttons that change it.
    await other.goto("/inventory");
    await expect(other.getByRole("button", { name: "Add Item" })).toHaveCount(0);
    await expect(other.getByRole("button", { name: "Check out" })).toHaveCount(0);
    await other.close();

    // Deactivate them again so the test database doesn't fill up with live accounts.
    await row(page, email).getByRole("button", { name: /^Edit / }).click();
    await dialog(page).getByLabel(/Active/).uncheck();
    await dialog(page).getByRole("button", { name: "Save" }).click();
    await expect(row(page, email)).toContainText("Inactive");
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

test.describe("as a technician", () => {
  test.skip(!tech.email || !tech.password, "Set E2E_TECH_EMAIL and E2E_TECH_PASSWORD");

  test("can check stock out but not add items, change settings, or manage users", async ({ page }) => {
    await signIn(page, tech);
    await page.goto("/inventory");
    await expect(page.getByRole("button", { name: "Add Item" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Check out" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Edit / })).toHaveCount(0);
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: "Save Changes" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Users" })).toHaveCount(0);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("every page fits the screen and the menu opens as a drawer", async ({ page }) => {
    await signIn(page);
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
