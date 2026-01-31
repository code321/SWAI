import { test, expect } from "../fixtures";
import { LoginPage } from "../pages/LoginPage";

test.describe("Login Flow", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
  });

  test("should display login form", async () => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("should show error for invalid credentials", async () => {
    await loginPage.login("invalid@example.com", "wrongpassword");

    // Wait for error message
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to dashboard on successful login", async () => {
    // This test requires a valid test user
    // You'll need to create a test user in your Supabase instance
    test.skip();

    // Example:
    // await loginPage.login('testuser@example.com', 'validpassword');
    // await expect(loginPage.page).toHaveURL('/app/dashboard');
  });
});
