import { test as base, expect } from "@playwright/test";
import { AdminPage } from "./pages/AdminPage";
import { DrawPage } from "./pages/DrawPage";
import { LoginPage } from "./pages/LoginPage";

const API_URL = "http://localhost:3000";
/** Seeded by `npm run seed` in backend/ — never in production. */
const ADMIN = { userName: "admin", password: "admin1234" };

interface Account {
  userName: string;
  password: string;
  token: string;
}

interface Fixtures {
  loginPage: LoginPage;
  /** A fresh account per test, registered through the API: no test leans on another's data. */
  newUser: Account;
  /** The same account, with one drawing already saved through the API. */
  userWithDrawing: Account;
  /** Signed in as `newUser`, on the drawing screen. */
  asUser: DrawPage;
  /** Signed in as the seeded admin, on the admin grid. */
  asAdmin: AdminPage;
}

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  newUser: async ({ request }, use) => {
    const userName = `e2e-${Date.now()}`;
    const password = "e2e-password";
    const res = await request.post(`${API_URL}/api/auth/register`, {
      data: { userName, password },
    });
    expect(res.ok()).toBe(true);
    const { token } = (await res.json()) as { token: string };

    await use({ userName, password, token });

    // The account stays (no endpoint deletes one), but without a drawing it never shows
    // on the admin grid. A 404 here only means the test already deleted it.
    await request.delete(`${API_URL}/api/drawing`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  userWithDrawing: async ({ request, newUser }, use) => {
    const res = await request.put(`${API_URL}/api/drawing`, {
      headers: { Authorization: `Bearer ${newUser.token}` },
      data: {
        title: "E2E diagonal",
        data: {
          version: 1,
          aspectRatio: 1.5,
          background: "#ffffff",
          strokes: [
            {
              color: "#e11d48",
              width: 0.01,
              points: [
                { x: 0.1, y: 0.1 },
                { x: 0.9, y: 0.9 },
              ],
            },
          ],
        },
      },
    });
    expect(res.ok()).toBe(true);
    await use(newUser);
  },

  asUser: async ({ page, loginPage, newUser }, use) => {
    await loginPage.goto();
    await loginPage.login(newUser.userName, newUser.password);
    await expect(page).toHaveURL("/");
    await use(new DrawPage(page));
  },

  asAdmin: async ({ page, loginPage }, use) => {
    await loginPage.goto();
    await loginPage.login(ADMIN.userName, ADMIN.password);
    await expect(page).toHaveURL("/admin");
    await use(new AdminPage(page));
  },
});

export { expect };
