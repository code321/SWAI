import { describe, it, expect, vi } from 'vitest';
import {
  mockSupabaseSuccess,
  mockSupabaseError,
  createMockUser,
  createMockFetchResponse,
  createMockOpenRouterResponse,
} from '../../helpers';

describe('Test Helpers Examples', () => {
  describe('Supabase Response Mocking', () => {
    it('should create successful response', () => {
      const data = { id: 1, name: 'Test Set' };
      const response = mockSupabaseSuccess(data);

      expect(response.data).toEqual(data);
      expect(response.error).toBeNull();
    });

    it('should create error response', () => {
      const response = mockSupabaseError('Something went wrong', 'error_code');

      expect(response.data).toBeNull();
      expect(response.error?.message).toBe('Something went wrong');
      expect(response.error?.code).toBe('error_code');
    });
  });

  describe('User Mocking', () => {
    it('should create mock user with defaults', () => {
      const user = createMockUser();

      expect(user.id).toBe('test-user-id');
      expect(user.email).toBe('test@example.com');
      expect(user.user_metadata?.timezone).toBe('Europe/Warsaw');
    });

    it('should create mock user with overrides', () => {
      const user = createMockUser({
        email: 'custom@example.com',
        user_metadata: { timezone: 'America/New_York' },
      });

      expect(user.email).toBe('custom@example.com');
      expect(user.user_metadata?.timezone).toBe('America/New_York');
    });
  });

  describe('Fetch Response Mocking', () => {
    it('should create successful fetch response', async () => {
      const data = { message: 'Success' };
      const response = createMockFetchResponse(data);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(data);
    });

    it('should create error fetch response', async () => {
      const data = { error: 'Not found' };
      const response = createMockFetchResponse(data, {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(data);
    });
  });

  describe('OpenRouter Response Mocking', () => {
    it('should create OpenRouter API response', () => {
      const content = 'Generated content here';
      const response = createMockOpenRouterResponse(content);

      expect(response.choices[0].message.content).toBe(content);
      expect(response.choices[0].finish_reason).toBe('stop');
      expect(response.usage).toBeDefined();
      expect(response.usage?.total_tokens).toBeGreaterThan(0);
    });

    it('should create OpenRouter response with custom model', () => {
      const content = 'Custom model response';
      const model = 'openai/gpt-4';
      const response = createMockOpenRouterResponse(content, model);

      expect(response.model).toBe(model);
      expect(response.choices[0].message.content).toBe(content);
    });
  });

  describe('Function Mocking Examples', () => {
    it('should mock a simple function', () => {
      const mockFn = vi.fn();
      mockFn.mockReturnValue('mocked value');

      const result = mockFn();

      expect(result).toBe('mocked value');
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('should mock async function', async () => {
      const mockAsyncFn = vi.fn();
      mockAsyncFn.mockResolvedValue({ data: 'async data' });

      const result = await mockAsyncFn();

      expect(result.data).toBe('async data');
      expect(mockAsyncFn).toHaveBeenCalledOnce();
    });

    it('should mock function with arguments', () => {
      const mockFn = vi.fn((a: number, b: number) => a + b);

      const result = mockFn(2, 3);

      expect(result).toBe(5);
      expect(mockFn).toHaveBeenCalledWith(2, 3);
    });

    it('should spy on existing function', () => {
      const calculator = {
        add: (a: number, b: number) => a + b,
      };

      const spy = vi.spyOn(calculator, 'add');

      calculator.add(2, 3);

      expect(spy).toHaveBeenCalledWith(2, 3);
      expect(spy).toHaveReturnedWith(5);
    });
  });
});
