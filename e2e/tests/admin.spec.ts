import { expect, test } from "../fixtures";

test.describe("admin", () => {
  test("sees the drawings of every seeded user", async ({ asAdmin }) => {
    await expect(asAdmin.heading).toBeVisible();
    for (const userName of ["demo", "alex", "sam"]) {
      await expect(asAdmin.card(userName)).toBeVisible();
    }
  });

  test("deletes a user's drawing after confirming", async ({ page, userWithDrawing, asAdmin }) => {
    const card = asAdmin.card(userWithDrawing.userName);
    await expect(card).toContainText("E2E diagonal");

    await asAdmin.deleteDrawingOf(userWithDrawing.userName);

    await expect(page.getByText(/was deleted successfully/)).toBeVisible();
    await expect(card).toHaveCount(0);

    // Gone from the server, not only from the list.
    await asAdmin.goto();
    await expect(asAdmin.heading).toBeVisible();
    await expect(asAdmin.card("demo")).toBeVisible();
    await expect(card).toHaveCount(0);
  });
});
