import type { Locator, Page } from "@playwright/test";

export class DrawPage {
  readonly canvas: Locator;
  readonly save: Locator;
  readonly adminLink: Locator;
  /** The line under the toolbar: "1 stroke · 12 points · saved …". */
  readonly meta: Locator;

  constructor(private readonly page: Page) {
    this.canvas = page.locator("canvas");
    this.save = page.getByRole("button", { name: "Save" });
    this.adminLink = page.getByRole("link", { name: "Admin" });
    this.meta = page.getByText(/stroke/);
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  /** A diagonal across the canvas. The mouse fires pointer events, as a finger would. */
  async drawStroke(): Promise<void> {
    const box = await this.canvas.boundingBox();
    if (!box) throw new Error("The canvas is not visible");
    const { mouse } = this.page;
    await mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
    await mouse.down();
    await mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 10 });
    await mouse.up();
  }
}
