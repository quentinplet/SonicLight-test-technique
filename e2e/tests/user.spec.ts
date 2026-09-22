import { expect, test } from "../fixtures";

test.describe("user", () => {
  test("a wrong password is refused with a readable message", async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login("demo", "not-the-password");

    await expect(loginPage.error).toHaveText("Incorrect user name or password.");
    await expect(page).toHaveURL("/login");
  });

  test("draws, saves, and finds the drawing again after a reload", async ({ page, asUser }) => {
    await expect(asUser.meta).toContainText("no stroke");
    await asUser.drawStroke();
    await expect(asUser.meta).toContainText("1 stroke");

    await asUser.save.click();
    await expect(page.getByText("Drawing saved successfully !")).toBeVisible();

    // The token survives the reload, and the strokes come back from the server.
    await page.reload();
    await expect(asUser.meta).toContainText("1 stroke");
    await expect(asUser.meta).toContainText("saved");
    await expect(asUser.meta).not.toContainText("not saved yet");
  });

  test("cannot reach the admin view", async ({ page, asUser }) => {
    await expect(asUser.adminLink).toBeHidden();

    // The guard is UI comfort; requireAdmin on the server is the real check (backend tests).
    await page.goto("/admin");
    await expect(page).toHaveURL("/");
  });
});
