import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchChatCompletion } from '@/lib/api/chat';
import { fetchBlockAction } from '@/lib/api/blockAction';
import { fetchConfig, clearConfigCache } from '@/lib/api/config';
import { ApiClientError } from '@/lib/api/client';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearConfigCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearConfigCache();
  });

  describe('fetchChatCompletion', () => {
    it('should call chat API with correct parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'Hello response' }),
      });

      const result = await fetchChatCompletion('Hello', 'thread-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            prompt: 'Hello',
            threadId: 'thread-123',
            mode: 'chat',
          }),
        })
      );
      expect(result).toEqual({ text: 'Hello response' });
    });

    it('should throw error for empty prompt', async () => {
      await expect(fetchChatCompletion('   ')).rejects.toThrow('Please provide a prompt');
    });

    it('should throw error for prompt too long', async () => {
      const longPrompt = 'a'.repeat(4001);
      await expect(fetchChatCompletion(longPrompt)).rejects.toThrow(
        'That prompt is a bit too long'
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid request' }),
      });

      await expect(fetchChatCompletion('Hello')).rejects.toThrow(ApiClientError);
      await expect(fetchChatCompletion('Hello')).rejects.toThrow('Invalid request');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network error'));

      await expect(fetchChatCompletion('Hello')).rejects.toThrow(ApiClientError);
      await expect(fetchChatCompletion('Hello')).rejects.toThrow(
        'Network error. Please check your connection.'
      );
    });
  });

  describe('fetchBlockAction', () => {
    it('should call block-action API with correct parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'Translated text' }),
      });

      const result = await fetchBlockAction('translate', 'Hello world');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/block-action',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'translate',
            blockText: 'Hello world',
            mode: 'block',
          }),
        })
      );
      expect(result).toEqual({ text: 'Translated text' });
    });

    it('should include prompt for ask action', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'Answer' }),
      });

      await fetchBlockAction('ask', 'Some text', 'What is this?');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/block-action',
        expect.objectContaining({
          body: JSON.stringify({
            action: 'ask',
            blockText: 'Some text',
            prompt: 'What is this?',
            mode: 'block',
          }),
        })
      );
    });

    it('should throw error for empty block text', async () => {
      await expect(fetchBlockAction('translate', '   ')).rejects.toThrow(
        'Block text cannot be empty'
      );
    });

    it('should throw error for ask without prompt', async () => {
      await expect(fetchBlockAction('ask', 'Some text')).rejects.toThrow(
        "Action 'ask' requires a prompt"
      );
    });

    it('should throw error for rewrite without prompt', async () => {
      await expect(fetchBlockAction('rewrite', 'Some text')).rejects.toThrow(
        "Action 'rewrite' requires a prompt"
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Unsupported action' }),
      });

      await expect(fetchBlockAction('translate', 'Hello')).rejects.toThrow(ApiClientError);
    });
  });

  describe('fetchConfig', () => {
    it('should call config API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          supabaseUrl: 'https://test.supabase.co',
          supabaseAnonKey: 'test-key',
        }),
      });

      const result = await fetchConfig();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/config',
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual({
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-key',
      });
    });

    it('should cache config on subsequent calls', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          supabaseUrl: 'https://test.supabase.co',
          supabaseAnonKey: 'test-key',
        }),
      });

      // First call
      await fetchConfig();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await fetchConfig();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          supabaseUrl: 'https://test.supabase.co',
          supabaseAnonKey: 'test-key',
        }),
      });

      await fetchConfig();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      clearConfigCache();

      await fetchConfig();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error for incomplete config', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          supabaseUrl: '',
          supabaseAnonKey: '',
        }),
      });

      await expect(fetchConfig()).rejects.toThrow('Supabase configuration is incomplete');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      await expect(fetchConfig()).rejects.toThrow(ApiClientError);
    });
  });
});
