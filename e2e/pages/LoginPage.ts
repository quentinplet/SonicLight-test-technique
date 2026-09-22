import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly userName: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.userName = page.getByLabel("User name");
    this.password = page.getByLabel("Password");
    this.submit = page.getByRole("button", { name: "Log in" });
    this.error = page.getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async login(userName: string, password: string): Promise<void> {
    await this.userName.fill(userName);
    await this.password.fill(password);
    await this.submit.click();
  }
}
