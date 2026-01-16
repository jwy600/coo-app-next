# Zustand Store Usage Guide

This guide shows how to use the Zustand store in React components.

## Basic Import

```typescript
import { useStore } from '@/lib/store';
```

## Using Store State

```typescript
function MyComponent() {
  // Get individual state slices
  const mode = useStore((state) => state.mode);
  const threads = useStore((state) => state.threads);
  const blocks = useStore((state) => state.blocks);
  const selectedBlockId = useStore((state) => state.selectedBlockId);

  // Or destructure multiple values
  const { mode, threads, activeThreadId } = useStore();

  return <div>Mode: {mode}</div>;
}
```

## Using Store Actions

```typescript
function ChatInput() {
  const addUserMessage = useStore((state) => state.addUserMessage);
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    // Add user message (returns message + blocks)
    const { message, blocks } = addUserMessage(text);

    console.log('Created message:', message.id);
    console.log('Created blocks:', blocks.length);

    setText('');
  };

  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
    />
  );
}
```

## Using Selectors

```typescript
import { useStore, selectActiveThread, selectSelectedBlock } from '@/lib/store';

function ThreadHeader() {
  // Use memoized selectors
  const activeThread = useStore(selectActiveThread);

  if (!activeThread) {
    return <div>No active thread</div>;
  }

  return (
    <div>
      <h1>{activeThread.title}</h1>
      <span>{activeThread.messages.length} messages</span>
    </div>
  );
}

function BlockActions() {
  const selectedBlock = useStore(selectSelectedBlock);

  if (!selectedBlock) {
    return null;
  }

  return (
    <div>
      Selected block: {selectedBlock.id}
    </div>
  );
}
```

## Common Patterns

### Thread Management

```typescript
function ThreadList() {
  const threads = useStore((state) => state.threads);
  const createThread = useStore((state) => state.createThread);
  const setActiveThread = useStore((state) => state.setActiveThread);

  const handleNewThread = () => {
    createThread(); // Auto-generates ID
    // Or with specific ID:
    createThread('my-thread-id');
  };

  return (
    <div>
      {threads.map((thread) => (
        <div key={thread.id} onClick={() => setActiveThread(thread.id)}>
          {thread.title}
        </div>
      ))}
      <button onClick={handleNewThread}>New Thread</button>
    </div>
  );
}
```

### Block Selection & Transform

```typescript
function Block({ blockId }: { blockId: string }) {
  const block = useStore(selectBlockById(blockId));
  const toggleSelectedBlock = useStore((state) => state.toggleSelectedBlock);
  const addSelection = useStore((state) => state.addSelection);
  const selectedBlockId = useStore((state) => state.selectedBlockId);

  const isSelected = selectedBlockId === blockId;

  const handleClick = () => {
    toggleSelectedBlock(blockId);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      addSelection(blockId, selection.toString());
    }
  };

  if (!block) return null;

  return (
    <div
      onClick={handleClick}
      onMouseUp={handleTextSelection}
      className={isSelected ? 'selected' : ''}
    >
      {block.text}
      {block.selections.length > 0 && (
        <div>Selections: {block.selections.join(', ')}</div>
      )}
    </div>
  );
}
```

### Block Rewrite with Undo

```typescript
function RewriteButton({ blockId }: { blockId: string }) {
  const block = useStore(selectBlockById(blockId));
  const toggleRewrite = useStore((state) => state.toggleRewrite);
  const [isRewriting, setIsRewriting] = useState(false);

  const handleRewrite = async () => {
    setIsRewriting(true);

    // Call API to get rewrite
    const response = await fetch('/api/block-action', {
      method: 'POST',
      body: JSON.stringify({
        action: 'rewrite',
        blockText: block.text,
        prompt: block.selections.join(', '),
      }),
    });

    const { text: rewriteText } = await response.json();

    // Toggle to rewritten text
    toggleRewrite(blockId, rewriteText);
    setIsRewriting(false);
  };

  const handleUndo = () => {
    // Toggle back to original
    toggleRewrite(blockId, '');
  };

  if (!block) return null;

  return (
    <div>
      {block.isRewritten ? (
        <button onClick={handleUndo}>Undo Rewrite</button>
      ) : (
        <button onClick={handleRewrite} disabled={isRewriting}>
          {isRewriting ? 'Rewriting...' : 'Rewrite'}
        </button>
      )}
    </div>
  );
}
```

### Mode Switching

```typescript
function ModeSwitch() {
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);

  return (
    <div>
      <button
        onClick={() => setMode('landing')}
        disabled={mode === 'landing'}
      >
        Landing
      </button>
      <button
        onClick={() => setMode('chat')}
        disabled={mode === 'chat'}
      >
        Chat
      </button>
    </div>
  );
}
```

### Loading Thread from Database

```typescript
import { loadThreadFromSupabase, loadMessagesForThread, loadBlocksForThread } from '@/lib/supabase';

async function loadThread(threadId: string) {
  const thread = await loadThreadFromSupabase(threadId);
  const messages = await loadMessagesForThread(threadId);
  const blocks = await loadBlocksForThread(threadId);

  if (thread) {
    // Merge into store
    const mergeThreadFromSupabase = useStore.getState().mergeThreadFromSupabase;
    mergeThreadFromSupabase(thread, messages, blocks);
  }
}

function ThreadLoader({ threadId }: { threadId: string }) {
  useEffect(() => {
    loadThread(threadId);
  }, [threadId]);

  return <div>Loading thread...</div>;
}
```

### Optimistic Updates

```typescript
function MessageSender() {
  const addUserMessage = useStore((state) => state.addUserMessage);
  const addAssistantMessage = useStore((state) => state.addAssistantMessage);
  const setAwaitingResponse = useStore((state) => state.setAwaitingResponse);

  const handleSend = async (text: string) => {
    // 1. Optimistically add user message (updates UI immediately)
    const { message } = addUserMessage(text);

    // 2. Show loading state
    setAwaitingResponse(true);

    try {
      // 3. Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ prompt: text }),
      });

      const { text: assistantText } = await response.json();

      // 4. Parse response into blocks
      const blocks = parseIntoBlocks(assistantText);

      // 5. Add assistant message (updates UI immediately)
      addAssistantMessage(blocks);
    } catch (error) {
      console.error('Failed to get response:', error);
      // TODO: Show error to user
    } finally {
      setAwaitingResponse(false);
    }
  };

  return <button onClick={() => handleSend('Hello')}>Send</button>;
}
```

## Performance Tips

### Use Selectors for Computed Values

```typescript
// ❌ Bad: Re-creates array on every render
function MyComponent() {
  const blocks = useStore((state) => state.blocks);
  const messageId = '123';
  const messageBlocks = blocks.filter((b) => b.messageId === messageId);
  // ...
}

// ✅ Good: Use memoized selector
import { selectBlocksByMessage } from '@/lib/store';

function MyComponent() {
  const messageBlocks = useStore(selectBlocksByMessage('123'));
  // ...
}
```

### Shallow Subscriptions

```typescript
// Only re-render when these specific values change
function MyComponent() {
  const { mode, activeThreadId } = useStore(
    (state) => ({
      mode: state.mode,
      activeThreadId: state.activeThreadId,
    }),
    shallow // Import from 'zustand/shallow'
  );
  // ...
}
```

### Action-Only Components

```typescript
// Component that only needs actions (never re-renders)
function ActionComponent() {
  const addUserMessage = useStore((state) => state.addUserMessage);

  // This component won't re-render when state changes
  // because it only accesses actions

  return <button onClick={() => addUserMessage('Hi')}>Send</button>;
}
```

## Debugging with DevTools

The store is configured with Zustand DevTools (in development mode):

1. Open React DevTools
2. Find "coo-store" in the Zustand DevTools panel
3. Inspect state changes, actions, and time-travel

## Type Safety

The store is fully typed. Use TypeScript to get autocomplete:

```typescript
import type { StoreState } from '@/lib/store';

// Get state type
const selectCustomValue = (state: StoreState) => {
  return state.threads.length > 0 ? state.threads[0] : null;
};

// Use in component
function MyComponent() {
  const firstThread = useStore(selectCustomValue);
  // firstThread is typed as Thread | null
}
```

## Testing Components with Store

```typescript
import { renderHook, act } from '@testing-library/react';
import { useStore } from '@/lib/store';

test('should add user message', () => {
  const { result } = renderHook(() => useStore());

  act(() => {
    result.current.createThread('test-thread');
    result.current.addUserMessage('Hello');
  });

  expect(result.current.blocks).toHaveLength(1);
  expect(result.current.blocks[0].text).toBe('Hello');
});
```
