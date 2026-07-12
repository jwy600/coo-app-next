import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { mockStoreActions, mockRegisterDocument } = vi.hoisted(() => ({
  mockStoreActions: {
    setMessageResponseId: vi.fn(),
    setRegisterState: vi.fn(),
    removeMessage: vi.fn(),
    setError: vi.fn(),
  },
  mockRegisterDocument: vi.fn(),
}));

let storeState: Record<string, unknown>;

vi.mock('@/lib/store/useStore', () => {
  const useStoreFn = vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector(storeState),
  );
  (useStoreFn as unknown as { getState: () => unknown }).getState = vi.fn(
    () => storeState,
  );
  return { useStore: useStoreFn };
});

vi.mock('@/lib/api', () => ({
  registerDocument: mockRegisterDocument,
}));

import { useDocRegistration } from '@/hooks/useDocRegistration';

const setStore = (overrides: Record<string, unknown> = {}) => {
  storeState = {
    ...mockStoreActions,
    settings: { apiKey: 'sk-test', model: 'gpt-5.6-luna' },
    ...overrides,
  };
};

const importedMsg = (overrides: Record<string, unknown> = {}) => ({
  id: 'msg-1',
  role: 'assistant',
  text: '# Doc body',
  meta: {
    source: 'import',
    fileName: 'doc.md',
    registerState: 'registering',
    registeringAt: 1000,
    ...overrides,
  },
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('useDocRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStore({ threads: [{ id: 't1', messages: [importedMsg()] }] });
  });

  it('registers a pending imported doc and marks it registered on success', async () => {
    mockRegisterDocument.mockResolvedValue('resp-1');
    renderHook(() => useDocRegistration('t1'));

    await waitFor(() =>
      expect(mockRegisterDocument).toHaveBeenCalledWith(
        '# Doc body',
        expect.anything(),
      ),
    );
    await waitFor(() =>
      expect(mockStoreActions.setMessageResponseId).toHaveBeenCalledWith(
        'msg-1',
        'resp-1',
      ),
    );
    expect(mockStoreActions.setRegisterState).toHaveBeenCalledWith(
      'msg-1',
      'registered',
    );
    expect(mockStoreActions.removeMessage).not.toHaveBeenCalled();
  });

  it('aborts (removes message + sets error) when registration fails', async () => {
    mockRegisterDocument.mockRejectedValue(new Error('boom'));
    renderHook(() => useDocRegistration('t1'));

    await waitFor(() => expect(mockRegisterDocument).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockStoreActions.removeMessage).toHaveBeenCalledWith('msg-1'),
    );
    expect(mockStoreActions.setError).toHaveBeenCalledWith(
      expect.stringContaining('doc.md'),
    );
    expect(mockStoreActions.setMessageResponseId).not.toHaveBeenCalled();
  });

  it('does nothing when the doc is already registered', async () => {
    setStore({
      threads: [
        {
          id: 't1',
          messages: [
            importedMsg({ registerState: 'registered', openaiResponseId: 'resp-x' }),
          ],
        },
      ],
    });
    renderHook(() => useDocRegistration('t1'));
    await flush();
    expect(mockRegisterDocument).not.toHaveBeenCalled();
  });

  it('does nothing when threadId is undefined', async () => {
    renderHook(() => useDocRegistration(undefined));
    await flush();
    expect(mockRegisterDocument).not.toHaveBeenCalled();
  });
});
