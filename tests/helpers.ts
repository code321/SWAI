import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  const mockQueryBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
      maybeSingle: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
    };
    return builder;
  };

  return {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(() => mockQueryBuilder()),
    rpc: vi.fn().mockReturnThis(),
  } as unknown as SupabaseClient;
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides = {}) {
  return {
    id: "test-user-id",
    email: "test@example.com",
    created_at: new Date().toISOString(),
    user_metadata: {
      timezone: "Europe/Warsaw",
    },
    ...overrides,
  };
}

/**
 * Create a mock session for testing
 */
export function createMockSession(overrides = {}) {
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: createMockUser(),
    ...overrides,
  };
}

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse<T>(data: T, options = {}) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => data,
    text: async () => JSON.stringify(data),
    ...options,
  } as Response;
}

/**
 * Mock successful Supabase response
 */
export function mockSupabaseSuccess<T>(data: T) {
  return {
    data,
    error: null,
  };
}

/**
 * Mock Supabase error response
 */
export function mockSupabaseError(message: string, code?: string) {
  return {
    data: null,
    error: {
      message,
      code,
      details: "",
      hint: "",
    },
  };
}

/**
 * Wait for a promise to resolve (useful in async tests)
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock localStorage for tests
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key];
    }),
    clear: vi.fn(() => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
}

/**
 * Mock OpenRouter API response
 */
export function createMockOpenRouterResponse(content: string, model = "anthropic/claude-3.5-sonnet") {
  return {
    id: "gen-" + Math.random().toString(36).substr(2, 9),
    model,
    choices: [
      {
        message: {
          role: "assistant",
          content,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  };
}
