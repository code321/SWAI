# Testing Guide

This project uses **Vitest** for unit and integration tests, and **Playwright** for end-to-end tests.

## Unit Tests (Vitest)

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

- `tests/setup.ts` - Global test setup and configuration
- `tests/unit/schemas/` - Tests for Zod schemas
- `tests/unit/services/` - Tests for service layer

### Writing Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup code here
    vi.clearAllMocks();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = someFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Mocking Examples

#### Mock Supabase Client

```typescript
import { vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

const mockSupabaseClient = {
  auth: {
    signInWithPassword: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  })),
};

vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);
```

#### Mock API Responses

```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' }),
});
```

### Coverage Goals

- Minimum 80% coverage for:
  - `src/lib/services/**/*.ts`
  - `src/lib/schemas/**/*.ts`

## End-to-End Tests (Playwright)

### Running Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run tests with UI mode
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Generate test code using codegen
npm run test:e2e:codegen
```

### Test Structure

- `e2e/` - E2E test files (*.spec.ts)
- `e2e/pages/` - Page Object Models
- `e2e/fixtures/` - Custom test fixtures
- `playwright.config.ts` - Playwright configuration

### Page Object Model Pattern

```typescript
// e2e/pages/LoginPage.ts
import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get emailInput() {
    return this.page.locator('input[name="email"]');
  }

  // Actions
  async login(email: string, password: string) {
    await this.fill(this.emailInput, email);
    await this.click(this.submitButton);
  }
}
```

### Writing E2E Tests

```typescript
// e2e/login.spec.ts
import { test, expect } from './fixtures';
import { LoginPage } from './pages/LoginPage';

test.describe('Login Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
  });

  test('should display login form', async () => {
    await expect(loginPage.emailInput).toBeVisible();
  });
});
```

## CI/CD Integration

Tests should be run in the following order in CI:

1. Linting: `npm run lint`
2. Unit tests: `npm test`
3. Build: `npm run build`
4. E2E tests: `npm run test:e2e`

## Best Practices

### Unit Tests

- Follow Arrange-Act-Assert pattern
- Use descriptive test names
- Mock external dependencies (Supabase, OpenRouter)
- Test edge cases and error conditions
- Keep tests focused and independent

### E2E Tests

- Use Page Object Model for maintainability
- Use data-testid attributes for stable selectors
- Test critical user journeys
- Handle test data cleanup
- Use browser contexts for test isolation
- Take screenshots on failures (automatic)

## Troubleshooting

### Vitest Issues

- If imports fail, check `vitest.config.ts` alias configuration
- Clear cache: `rm -rf node_modules/.vitest`
- Check that test files match the include pattern

### Playwright Issues

- Install browsers: `npx playwright install chromium`
- Check base URL in `playwright.config.ts`
- View trace files: `npx playwright show-trace trace.zip`
- Use `--headed` flag to see what's happening

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
