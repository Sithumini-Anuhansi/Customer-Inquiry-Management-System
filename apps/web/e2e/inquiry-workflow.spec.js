import { expect, test } from "@playwright/test";

const staffEmail = process.env.E2E_STAFF_EMAIL || "staff@example.com";
const staffPassword = process.env.E2E_STAFF_PASSWORD || "staff123";

async function signIn(page) {
  await page.goto("/");
  await page.getByLabel("Work email").fill(staffEmail);
  await page.getByLabel("Password", { exact: true }).fill(staffPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Inquiry overview" })).toBeVisible();
}

async function createInquiry(page, customerName) {
  await page.getByRole("button", { name: /New inquiry/ }).click();
  await page.getByLabel("Customer name").fill(customerName);
  await page.getByLabel("Contact details").fill("browser-test@example.test");
  await page.getByLabel("Subject").fill(`E2E workflow ${customerName}`);
  await page.getByLabel("Description").fill("End-to-end browser automation verifies the complete staff inquiry workflow.");
  await page.getByRole("button", { name: "Save inquiry" }).click();
  await expect(page.getByRole("status")).toContainText(`Inquiry for ${customerName} was saved.`);
}

async function openInquiryFromSearch(page, customerName) {
  await page.getByRole("textbox", { name: "Search inquiries" }).fill(customerName);
  await expect(page.getByText(/Showing 1 inquiry matching/)).toBeVisible();
  const customerLink = page.getByRole("link", { name: customerName, exact: true });
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/inquiries/")),
    customerLink.click(),
  ]);
  await expect(page.getByRole("heading", { name: "Status history" })).toBeVisible();
}

test("staff can sign in, create, find, review, and resolve an inquiry", async ({ page }) => {
  const customerName = `Browser Test ${Date.now()}`;

  await signIn(page);
  await createInquiry(page, customerName);

  await openInquiryFromSearch(page, customerName);
  await expect(page.getByText("Inquiry created · New")).toBeVisible();

  await page.getByRole("button", { name: "Start working" }).click();
  await expect(page.locator(".workflow-current .status-pill")).toHaveText("In Progress");
  await expect(page.getByText("New → In Progress")).toBeVisible();

  await page.getByRole("button", { name: "Mark as resolved" }).click();
  await expect(page.locator(".workflow-current .status-pill")).toHaveText("Resolved");
  await expect(page.getByText("In Progress → Resolved")).toBeVisible();

  await page.getByRole("link", { name: /All inquiries/ }).click();
  await expect(page.getByRole("heading", { name: "Inquiry overview" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("a second browser tab reports and refreshes a stale inquiry update", async ({ page, context }) => {
  const customerName = `Stale Browser Test ${Date.now()}`;
  await signIn(page);
  await createInquiry(page, customerName);
  await openInquiryFromSearch(page, customerName);
  const inquiryUrl = page.url();

  const secondTab = await context.newPage();
  await secondTab.goto(inquiryUrl);
  await expect(secondTab.getByRole("heading", { name: "Status history" })).toBeVisible();

  await page.getByRole("button", { name: "Start working" }).click();
  await expect(page.locator(".workflow-current .status-pill")).toHaveText("In Progress");

  await secondTab.getByRole("button", { name: "Start working" }).click();
  await expect(secondTab.getByRole("status")).toContainText("changed after you opened it");
  await expect(secondTab.locator(".workflow-current .status-pill")).toHaveText("In Progress");
});
