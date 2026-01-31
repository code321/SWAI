import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class LoginPage extends BasePage {
  // Locators
  get emailInput() {
    return this.page.locator('input[name="email"]');
  }

  get passwordInput() {
    return this.page.locator('input[name="password"]');
  }

  get submitButton() {
    return this.page.locator('button[type="submit"]');
  }

  get errorMessage() {
    return this.page.locator('[role="alert"]');
  }

  // Actions
  async navigateToLogin() {
    await this.goto("/auth/login");
    await this.waitForLoad();
  }

  async login(email: string, password: string) {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.submitButton);
  }

  async getErrorText() {
    return await this.getTextContent(this.errorMessage);
  }
}
