import type { Page, Locator } from "@playwright/test";

/**
 * Base Page Object Model class
 * All page objects should extend this class
 */
export class BasePage {
  constructor(public readonly page: Page) {}

  /**
   * Navigate to a specific path
   */
  async goto(path: string) {
    await this.page.goto(path);
  }

  /**
   * Wait for the page to be loaded
   */
  async waitForLoad() {
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Get text content of an element
   */
  async getTextContent(locator: Locator): Promise<string> {
    return (await locator.textContent()) ?? "";
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  /**
   * Click on an element
   */
  async click(locator: Locator) {
    await locator.click();
  }

  /**
   * Fill input field
   */
  async fill(locator: Locator, value: string) {
    await locator.fill(value);
  }

  /**
   * Take a screenshot
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }
}
