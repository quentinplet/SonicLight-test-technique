import type { Locator, Page } from "@playwright/test";

export class AdminPage {
  readonly heading: Locator;
  readonly cards: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Drawings" });
    this.cards = page.getByRole("listitem");
  }

  async goto(): Promise<void> {
    await this.page.goto("/admin");
  }

  /** A card is found by its author: one drawing per user makes the user name unique. */
  card(userName: string): Locator {
    return this.cards.filter({ hasText: userName });
  }

  /** Through the confirmation dialog, as a moderator would. */
  async deleteDrawingOf(userName: string): Promise<void> {
    await this.card(userName).getByRole("button", { name: /^Delete/ }).click();
    await this.page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  }
}
