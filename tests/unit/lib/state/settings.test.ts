import { describe, it, expect } from 'vitest';
import {
  createInitialSettings,
  updateModel,
  updateReasoningEffort,
  updateWebSearchEnabled,
  resetSettings,
} from '@/lib/state/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';
import type { Settings } from '@/types/settings';

describe('Settings State Functions', () => {
  describe('createInitialSettings', () => {
    it('should create settings with default values', () => {
      const settings = createInitialSettings();
      expect(settings.model).toBe('gpt-5-mini');
      expect(settings.reasoningEffort).toBe('none');
      expect(settings.webSearchEnabled).toBe(false);
    });

    it('should match DEFAULT_SETTINGS', () => {
      const settings = createInitialSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should return a new object each time (immutability)', () => {
      const settings1 = createInitialSettings();
      const settings2 = createInitialSettings();
      expect(settings1).not.toBe(settings2);
      expect(settings1).toEqual(settings2);
    });
  });

  describe('updateModel', () => {
    it('should update model to gpt-5.2', () => {
      const settings = createInitialSettings();
      const updated = updateModel(settings, 'gpt-5.2');
      expect(updated.model).toBe('gpt-5.2');
    });

    it('should update model to gpt-5-mini', () => {
      const settings: Settings = { ...DEFAULT_SETTINGS, model: 'gpt-5.2' };
      const updated = updateModel(settings, 'gpt-5-mini');
      expect(updated.model).toBe('gpt-5-mini');
    });

    it('should maintain immutability', () => {
      const settings = createInitialSettings();
      const updated = updateModel(settings, 'gpt-5.2');
      expect(updated).not.toBe(settings);
      expect(settings.model).toBe('gpt-5-mini');
    });

    it('should preserve other settings', () => {
      const settings: Settings = {
        model: 'gpt-5-mini',
        reasoningEffort: 'high',
        webSearchEnabled: true,
        translateLanguage: 'English',
      };
      const updated = updateModel(settings, 'gpt-5.2');
      expect(updated.reasoningEffort).toBe('high');
      expect(updated.webSearchEnabled).toBe(true);
      expect(updated.translateLanguage).toBe('English');
    });
  });

  describe('updateReasoningEffort', () => {
    it('should update reasoning effort to low', () => {
      const settings = createInitialSettings();
      const updated = updateReasoningEffort(settings, 'low');
      expect(updated.reasoningEffort).toBe('low');
    });

    it('should update reasoning effort to medium', () => {
      const settings = createInitialSettings();
      const updated = updateReasoningEffort(settings, 'medium');
      expect(updated.reasoningEffort).toBe('medium');
    });

    it('should update reasoning effort to high', () => {
      const settings = createInitialSettings();
      const updated = updateReasoningEffort(settings, 'high');
      expect(updated.reasoningEffort).toBe('high');
    });

    it('should update reasoning effort to none', () => {
      const settings: Settings = { ...DEFAULT_SETTINGS, reasoningEffort: 'high' };
      const updated = updateReasoningEffort(settings, 'none');
      expect(updated.reasoningEffort).toBe('none');
    });

    it('should maintain immutability', () => {
      const settings = createInitialSettings();
      const updated = updateReasoningEffort(settings, 'high');
      expect(updated).not.toBe(settings);
      expect(settings.reasoningEffort).toBe('none');
    });

    it('should preserve other settings', () => {
      const settings: Settings = {
        model: 'gpt-5.2',
        reasoningEffort: 'none',
        webSearchEnabled: true,
        translateLanguage: 'Spanish',
      };
      const updated = updateReasoningEffort(settings, 'medium');
      expect(updated.model).toBe('gpt-5.2');
      expect(updated.webSearchEnabled).toBe(true);
      expect(updated.translateLanguage).toBe('Spanish');
    });
  });

  describe('updateWebSearchEnabled', () => {
    it('should enable web search', () => {
      const settings = createInitialSettings();
      const updated = updateWebSearchEnabled(settings, true);
      expect(updated.webSearchEnabled).toBe(true);
    });

    it('should disable web search', () => {
      const settings: Settings = { ...DEFAULT_SETTINGS, webSearchEnabled: true };
      const updated = updateWebSearchEnabled(settings, false);
      expect(updated.webSearchEnabled).toBe(false);
    });

    it('should maintain immutability', () => {
      const settings = createInitialSettings();
      const updated = updateWebSearchEnabled(settings, true);
      expect(updated).not.toBe(settings);
      expect(settings.webSearchEnabled).toBe(false);
    });

    it('should preserve other settings', () => {
      const settings: Settings = {
        model: 'gpt-5.2',
        reasoningEffort: 'high',
        webSearchEnabled: false,
        translateLanguage: 'French',
      };
      const updated = updateWebSearchEnabled(settings, true);
      expect(updated.model).toBe('gpt-5.2');
      expect(updated.reasoningEffort).toBe('high');
      expect(updated.translateLanguage).toBe('French');
    });
  });

  describe('resetSettings', () => {
    it('should reset to default settings', () => {
      const reset = resetSettings();
      expect(reset).toEqual(DEFAULT_SETTINGS);
    });

    it('should return a new object each time', () => {
      const reset1 = resetSettings();
      const reset2 = resetSettings();
      expect(reset1).not.toBe(reset2);
      expect(reset1).toEqual(reset2);
    });
  });
});
