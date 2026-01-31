import { test as base } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TestFixtures {
  // Add custom fixtures here as needed
}

export const test = base.extend<TestFixtures>({
  // Custom fixture implementations will go here
});

export { expect } from "@playwright/test";
