# New UI Design Structure Plan

## Overview

This document defines the new UI structure for the Coo app with a collapsible sidebar layout.

---

## 1. Layout Structure

### Overall Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                           UNIFIED LAYOUT                             │
│                                                                      │
│  ┌──────────────┬──────────────────────────────────────────────────┐│
│  │   SIDEBAR    │            MAIN CONTENT AREA                     ││
│  │   (LEFT)     │                                                  ││
│  │              │   (No header - clean, minimal)                   ││
│  │ ┌──────────┐ │                                                  ││
│  │ │ Logo     │ │   ┌──────────────────────────────────────────┐  ││
│  │ ├──────────┤ │   │                                          │  ││
│  │ │ New Chat │ │   │      EMPTY STATE                         │  ││
│  │ │ Button   │ │   │      - Simple tagline                    │  ││
│  │ ├──────────┤ │   │      - Centered composer                 │  ││
│  │ │          │ │   │                                          │  ││
│  │ │ Thread   │ │   │      ─── OR ───                          │  ││
│  │ │ List     │ │   │                                          │  ││
│  │ │          │ │   │      THREAD VIEW                         │  ││
│  │ │ • Thread1│ │   │      - Message list (no header)          │  ││
│  │ │ • Thread2│ │   │      - Composer at bottom                │  ││
│  │ │ • Thread3│ │   │                                          │  ││
│  │ │   ...    │ │   └──────────────────────────────────────────┘  ││
│  │ │          │ │                                                  ││
│  │ └──────────┘ │                                                  ││
│  │      [×]     │  (Toggle button: top-right when expanded)        ││
│  └──────────────┴──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Collapsed Sidebar State

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌────┬───────────────────────────────────────────────────────────┐│
│  │ ☰  │                                                           ││
│  │Logo│           MAIN CONTENT AREA                               ││
│  ├────┤           (full width)                                    ││
│  │ +  │                                                           ││
│  │    │                                                           ││
│  └────┘                                                           ││
│                                                                    ││
│   Collapsed sidebar shows:                                         ││
│   - Logo (hover to expand, like ChatGPT)                          ││
│   - New Chat icon (+)                                             ││
│                                                                    ││
│                                                                    ││
│  └────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Sidebar Structure

### Sidebar Elements (Top to Bottom)

| Element | Position | Behavior |
|---------|----------|----------|
| **Logo** | Top | When collapsed: hover expands sidebar (like ChatGPT) |
| **Toggle Button** | Top-right | Only visible when sidebar is expanded (×) |
| **New Chat Button** | Below logo | Creates new thread, navigates to empty state |
| **Thread List** | Below new chat | Simple scrollable list of thread titles |

### Sidebar States

| State | Width | Shows |
|-------|-------|-------|
| **Expanded** | ~250-280px | Logo, toggle (×), new chat button, thread list |
| **Collapsed** | ~48-64px | Logo icon, new chat icon (+) |

### Sidebar Toggle Behavior

- **When expanded**: Toggle button (×) in top-right corner closes sidebar
- **When collapsed**: Hovering on logo expands sidebar (ChatGPT-style)
- **State persistence**: Saves to localStorage, remembered across sessions

### Mobile Behavior

- **Trigger**: Tap hamburger menu or swipe from left edge
- **Display**: Overlay drawer that slides in from left
- **Dismiss**: Tap outside, swipe left, or tap close button

---

## 3. Main Content Area

### No Header

The main content area has NO header bar. This provides:
- Maximum vertical space for content
- Clean, minimal appearance
- Focus on conversation

### Empty State (No Thread Selected)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                    "AI writing assistant"                   │
│                      (simple tagline)                       │
│                                                             │
│              ┌─────────────────────────────┐               │
│              │   Ask anything...           │               │
│              │   (placeholder text)        │               │
│              └─────────────────────────────┘               │
│                        [Send →]                             │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

- Composer: CENTERED vertically and horizontally
- Welcome: Simple tagline only (no badges)
- Placeholder: Just text inside input (no label)
```

### Thread View (Thread Selected)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ You                                                    │ │
│  │ What is machine learning?                              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Coo                                                    │ │
│  │ ┌─────────────────────────────────────────────────┐   │ │
│  │ │ Machine learning is a subset of AI...           │   │ │
│  │ │ (Block 1 - handle visible on hover)             │   │ │
│  │ └─────────────────────────────────────────────────┘   │ │
│  │ ┌─────────────────────────────────────────────────┐   │ │
│  │ │ There are three main types:                      │   │ │
│  │ │ • Supervised learning                            │   │ │
│  │ │ • Unsupervised learning                          │   │ │
│  │ │ (Block 2)                                        │   │ │
│  │ └─────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Ask anything... (placeholder)                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                [Send →]    │
└─────────────────────────────────────────────────────────────┘

- Message list: NO header, messages start immediately
- Composer: Fixed at BOTTOM
- Blocks: 6-dot handle visible on HOVER only
```

---

## 4. Block Interactions

### Block Selection

| Element | Behavior |
|---------|----------|
| **6-dot handle** | Visible on hover only |
| **Click handle** | Selects the block |
| **Selected state** | Block highlighted, other blocks muted |

### Selection Chips (Text Highlighting)

```
┌─────────────────────────────────────────────────────────────┐
│ Coo                                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Machine learning is a subset of AI that enables...      │ │
│ │ (Selected block - highlighted)                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [machine learning] [×]  [subset of AI] [×]              │ │
│ │ Selection chips - BELOW the block                       │ │
│ │ [Clear all]  [Rewrite]                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- **Position**: Selection chips appear BELOW the selected block
- **Actions**: Clear all, Rewrite (or Undo if already rewritten)

### Block Action Buttons

```
┌───────────────────────────────────────────────────────────────┐
│ Composer (when block selected):                               │
│                                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Ask about the selected paragraph... (placeholder)        │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ [Translate] [Example] [ELI5] [Expand]         [Send →]       │
│                                                               │
│ Block action buttons appear IN COMPOSER AREA                  │
└───────────────────────────────────────────────────────────────┘
```

- **Position**: Block actions appear in composer area when a block is selected
- **Actions**: Translate, Example, ELI5, Expand (keep existing actions)

---

## 5. Composer Details

### Composer States

| State | Position | Placeholder |
|-------|----------|-------------|
| **Empty state** | Centered (vertical + horizontal) | "Ask anything..." |
| **Thread view (chat mode)** | Fixed bottom | "Ask anything..." |
| **Thread view (block mode)** | Fixed bottom | "Ask about the selected paragraph..." |

### Composer Elements

- **Label**: NO label (placeholder text only)
- **Input**: Same contenteditable div
- **Send button**: "Send →" or just "→"
- **Block controls**: Appear below input when block selected

---

## 6. Loading States

### Typing Indicator

```
┌───────────────────────────────────────────────────────────┐
│ Coo                                                        │
│                                                            │
│ Coo is thinking...                                         │
│ (with animated dots or pulse animation)                    │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

- **Style**: "Coo is thinking..." with animation
- **No skeleton loaders**, just typing indicator

---

## 7. Component Structure

### New Components to Create

```
components/
├── layout/
│   └── AppLayout.tsx          # Unified layout with sidebar + main
│
├── sidebar/
│   ├── Sidebar.tsx            # Collapsible sidebar container
│   ├── SidebarLogo.tsx        # Logo with hover-to-expand behavior
│   ├── NewChatButton.tsx      # New chat button
│   └── ThreadList.tsx         # Thread list (moved from landing/)
│
├── empty-state/
│   └── EmptyState.tsx         # Welcome message + centered composer
│
└── chat/
    └── TypingIndicator.tsx    # "Coo is thinking..." animation
```

### Component Hierarchy

```
AppLayout
├── Sidebar
│   ├── SidebarLogo (hover to expand when collapsed)
│   ├── Toggle Button (× when expanded)
│   ├── NewChatButton (+)
│   └── ThreadList
│       └── ThreadPill × N
│
└── MainContent
    │
    ├── EmptyState (when no thread selected)
    │   ├── Logo
    │   ├── Tagline
    │   └── Composer (centered)
    │
    └── ChatContainer (when thread selected)
        ├── MessageList (no header)
        │   ├── UserMessage
        │   └── AssistantMessage
        │       └── BlockStack
        │           └── DocBlock
        │               ├── GutterHandle (visible on hover)
        │               ├── BlockContent
        │               └── SelectionChips (below block when selected)
        │   └── TypingIndicator (when streaming)
        │
        └── Composer (fixed bottom)
            ├── PromptInput (placeholder only)
            ├── BlockControls (when block selected)
            └── SendButton
```

---

## 8. State Management

### New State

```typescript
// Add to uiSlice.ts
interface UIState {
  sidebarOpen: boolean;  // NEW: sidebar expanded/collapsed
  // ... existing state
}
```

### Persistence

- `sidebarOpen` persists to localStorage
- Remembered across sessions

---

## 9. Route Structure

### Routes

| Route | Content |
|-------|---------|
| `/` | AppLayout with EmptyState |
| `/t/[threadId]` | AppLayout with ChatContainer |

Both routes use the same `AppLayout` component.

---

## 10. Files to Create/Modify

### Create

| File | Purpose |
|------|---------|
| `components/layout/AppLayout.tsx` | Unified layout |
| `components/sidebar/Sidebar.tsx` | Sidebar container |
| `components/sidebar/SidebarLogo.tsx` | Logo with hover behavior |
| `components/sidebar/NewChatButton.tsx` | New chat button |
| `components/empty-state/EmptyState.tsx` | Empty state view |
| `components/chat/TypingIndicator.tsx` | Typing animation |

### Modify

| File | Changes |
|------|---------|
| `app/page.tsx` | Use AppLayout + EmptyState |
| `app/t/[threadId]/page.tsx` | Use AppLayout + ChatContainer |
| `components/landing/ThreadList.tsx` | Move to sidebar/ |
| `components/chat/DocBlock.tsx` | Handle visible on hover |
| `components/chat/SelectionChips.tsx` | Position below block |
| `components/composer/Composer.tsx` | Remove label, centered option |
| `lib/store/slices/uiSlice.ts` | Add sidebarOpen state |

### Delete

| File | Reason |
|------|--------|
| `components/landing/LandingContainer.tsx` | Replaced by AppLayout |
| `components/landing/Hero.tsx` | Unused |
| `components/layout/Header.tsx` | No header in new design |

---

## 11. Implementation Steps

### Phase 1: Layout Foundation
1. Create `AppLayout.tsx` with sidebar + main content structure
2. Create `Sidebar.tsx` container
3. Create `EmptyState.tsx` with centered composer

### Phase 2: Sidebar Features
4. Implement `SidebarLogo.tsx` with hover-to-expand
5. Move `ThreadList.tsx` to sidebar
6. Add `NewChatButton.tsx`
7. Implement collapse/expand toggle

### Phase 3: State & Persistence
8. Add `sidebarOpen` to uiSlice
9. Add localStorage persistence

### Phase 4: Route Integration
10. Update `app/page.tsx` to use new layout
11. Update `app/t/[threadId]/page.tsx` to use new layout

### Phase 5: Component Updates
12. Update `DocBlock.tsx` - handle visible on hover
13. Update `SelectionChips.tsx` - position below block
14. Update `Composer.tsx` - remove label, centered positioning
15. Create `TypingIndicator.tsx`

### Phase 6: Cleanup
16. Remove deprecated components
17. Update tests

---

## 12. Verification

### Manual Testing

1. **Sidebar toggle**: Click × to collapse, hover logo to expand
2. **Persistence**: Refresh page, sidebar state preserved
3. **New chat**: Click + button, navigates to empty state
4. **Empty state**: Shows tagline + centered composer
5. **Submit message**: Thread created, composer moves to bottom
6. **Thread list**: Thread appears in sidebar
7. **Block selection**: Hover shows handle, click selects
8. **Selection chips**: Appear below selected block
9. **Block actions**: Appear in composer area
10. **Mobile**: Sidebar is overlay drawer

### Automated Tests

- Update E2E tests for new navigation
- Test sidebar state persistence
- Ensure chat/block features still work
