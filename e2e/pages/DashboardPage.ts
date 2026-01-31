import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DashboardPage extends BasePage {
  // Locators
  get welcomeMessage() {
    return this.page.locator("h1, h2").first();
  }

  get createSetButton() {
    return this.page.locator('button:has-text("Create")');
  }

  get statsCards() {
    return this.page.locator('[data-testid="stats-card"]');
  }

  get userMenu() {
    return this.page.locator('[data-testid="user-menu"]');
  }

  // Actions
  async navigateToDashboard() {
    await this.goto("/app/dashboard");
    await this.waitForLoad();
  }

  async clickCreateSet() {
    await this.click(this.createSetButton);
  }

  async getStatsCount() {
    return await this.statsCards.count();
  }

  async openUserMenu() {
    await this.click(this.userMenu);
  }
}
