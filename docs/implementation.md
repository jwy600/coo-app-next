# Shadcn UI Component Implementation Plan

This document maps shadcn/ui components to the UI structure defined in `NEW_UI_STRUCTURE.md`.

---

## Recommended Block

**`sidebar-01` through `sidebar-16`** - Use one of the sidebar blocks as the foundation. These blocks provide the complete collapsible sidebar layout with all necessary subcomponents.

---

## Component Mapping by UI Section

### 1. AppLayout (Root Layout)

| Component | Purpose |
|-----------|---------|
| **`sidebar`** | Primary component - provides `SidebarProvider`, `Sidebar`, `SidebarInset` |
| **`resizable`** | Optional - for resizable sidebar width |

---

### 2. Sidebar Section

| UI Element | Shadcn Component |
|------------|------------------|
| **Sidebar Container** | `Sidebar`, `SidebarContent` |
| **Logo Area** | `SidebarHeader` |
| **Toggle Button (×)** | `SidebarTrigger`, `button` |
| **New Chat Button** | `button` |
| **Thread List Container** | `SidebarGroup`, `SidebarGroupContent` |
| **Thread Items** | `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` |
| **Scrollable Thread List** | `scroll-area` |
| **Mobile Sidebar (Drawer)** | `sheet` (via Sidebar's mobile mode) |
| **Collapsed State Icons** | `tooltip` (for icon-only hints) |

---

### 3. Empty State (No Thread Selected)

| UI Element | Shadcn Component |
|------------|------------------|
| **Container** | `empty` |
| **Tagline Text** | Native `<p>` (no component needed) |
| **Centered Composer Input** | `textarea` |
| **Send Button** | `button` |

---

### 4. Thread View (Chat Container)

| UI Element | Shadcn Component |
|------------|------------------|
| **Message List Container** | `scroll-area` |
| **User Message Card** | `card` (optional, or custom div) |
| **Assistant Message Card** | `card` (optional, or custom div) |
| **Typing Indicator** | `spinner` |

---

### 5. Block Interactions

| UI Element | Shadcn Component |
|------------|------------------|
| **6-dot Drag Handle** | Custom (no shadcn equivalent) |
| **Selection Chips Container** | `badge` (for each selection) |
| **Clear All / Rewrite Buttons** | `button` |
| **Block Hover State** | `hover-card` (optional) |

---

### 6. Composer Section

| UI Element | Shadcn Component |
|------------|------------------|
| **Input Field** | `textarea` |
| **Send Button** | `button` |
| **Block Action Buttons** | `button-group` or `toggle-group` |
| **Action Buttons (Translate, ELI5, etc.)** | `button` (variant: outline/ghost) |

---

### 7. Additional UI Elements

| UI Element | Shadcn Component |
|------------|------------------|
| **Keyboard Shortcuts Display** | `kbd` |
| **Confirmation Dialogs** | `alert-dialog` |
| **Notifications/Toasts** | `sonner` |
| **Loading States** | `spinner`, `skeleton` |
| **Separators** | `separator` |
| **Context Menus (right-click)** | `context-menu` |
| **Dropdown Menus** | `dropdown-menu` |

---

## Summary: Required Shadcn Components

### Core Components (Must Install)

1. `sidebar` - Primary layout component
2. `button` - Buttons throughout
3. `scroll-area` - Scrollable lists
4. `textarea` - Composer input
5. `tooltip` - Collapsed sidebar hints
6. `badge` - Selection chips
7. `separator` - Visual dividers
8. `spinner` - Loading/typing indicator

### Optional Components (Enhance UX)

9. `card` - Message containers
10. `sheet` - Mobile drawer (may be bundled with sidebar)
11. `alert-dialog` - Confirmations
12. `sonner` - Toast notifications
13. `kbd` - Keyboard shortcut display
14. `context-menu` - Right-click menus
15. `dropdown-menu` - Menu dropdowns
16. `toggle-group` - Block action buttons
17. `empty` - Empty state component

---

## Component to File Mapping

### New Components to Create

| File | Shadcn Components Used |
|------|------------------------|
| `components/layout/AppLayout.tsx` | `SidebarProvider`, `SidebarInset` |
| `components/sidebar/Sidebar.tsx` | `Sidebar`, `SidebarContent`, `SidebarHeader`, `SidebarFooter` |
| `components/sidebar/SidebarLogo.tsx` | `SidebarMenuButton`, `tooltip` |
| `components/sidebar/NewChatButton.tsx` | `SidebarMenuButton`, `button`, `tooltip` |
| `components/sidebar/ThreadList.tsx` | `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `scroll-area` |
| `components/empty-state/EmptyState.tsx` | `empty`, `textarea`, `button` |
| `components/chat/TypingIndicator.tsx` | `spinner` |

### Existing Components to Update

| File | Shadcn Components to Add |
|------|--------------------------|
| `components/chat/SelectionChips.tsx` | `badge`, `button` |
| `components/composer/Composer.tsx` | `textarea`, `button`, `toggle-group` |

---

## Sidebar Block Selection Guide

Review these sidebar blocks to find the best match:

| Block | Best For |
|-------|----------|
| `sidebar-01` | Basic collapsible sidebar |
| `sidebar-02` to `sidebar-05` | Variations with different header/footer layouts |
| `sidebar-06` to `sidebar-10` | Advanced features (nested menus, icons) |
| `sidebar-11` to `sidebar-16` | Complex layouts with multiple sections |

Select a block that provides:
- Logo in header area
- Collapsible toggle button
- Scrollable content area
- Mobile sheet/drawer support (ChatGPT-style)

---

## Installation Commands

```bash
# Core components
npx shadcn@latest add sidebar
npx shadcn@latest add button
npx shadcn@latest add scroll-area
npx shadcn@latest add textarea
npx shadcn@latest add tooltip
npx shadcn@latest add badge
npx shadcn@latest add separator
npx shadcn@latest add spinner

# Optional components
npx shadcn@latest add card
npx shadcn@latest add sheet
npx shadcn@latest add alert-dialog
npx shadcn@latest add sonner
npx shadcn@latest add kbd
npx shadcn@latest add context-menu
npx shadcn@latest add dropdown-menu
npx shadcn@latest add toggle-group
npx shadcn@latest add empty
```

---

## Implementation Status

### Completed

| Task | Status | Notes |
|------|--------|-------|
| shadcn initialization | Done | Using new-york style |
| Core components installed | Done | sidebar, button, scroll-area, textarea, tooltip, badge, separator, spinner |
| Optional components installed | Done | card, sheet, alert-dialog, sonner |
| `components/layout/AppLayout.tsx` | Done | SidebarProvider + SidebarInset wrapper |
| `components/sidebar/AppSidebar.tsx` | Done | Main sidebar component |
| `components/sidebar/SidebarLogo.tsx` | Done | Logo with tooltip |
| `components/sidebar/NewChatButton.tsx` | Done | Plus icon button |
| `components/sidebar/SidebarThreadList.tsx` | Done | Thread list with active state |
| `components/empty-state/EmptyState.tsx` | Done | Centered layout with tagline |
| `components/chat/TypingIndicator.tsx` | Done | Spinner with "Coo is thinking..." |
| `app/page.tsx` updated | Done | Uses AppLayout |
| `app/t/[threadId]/page.tsx` updated | Done | Uses AppLayout |
| `app/landing-content.tsx` created | Done | Client component for landing page |
| `app/t/[threadId]/thread-content.tsx` created | Done | Client component for thread page |
| Composer updated | Done | Added `centered` prop for empty state |
| Button imports updated | Done | Using shadcn button component |
| Badge imports updated | Done | Using shadcn badge component |
| Tests updated | Done | All 274 tests passing |

### Files Created

```
components/
├── layout/
│   └── AppLayout.tsx
├── sidebar/
│   ├── index.ts
│   ├── AppSidebar.tsx
│   ├── SidebarLogo.tsx
│   ├── NewChatButton.tsx
│   └── SidebarThreadList.tsx
├── empty-state/
│   ├── index.ts
│   └── EmptyState.tsx
├── chat/
│   └── TypingIndicator.tsx
└── ui/
    ├── sidebar.tsx (shadcn)
    ├── button.tsx (shadcn)
    ├── scroll-area.tsx (shadcn)
    ├── textarea.tsx (shadcn)
    ├── tooltip.tsx (shadcn)
    ├── badge.tsx (shadcn)
    ├── separator.tsx (shadcn)
    ├── spinner.tsx (shadcn)
    ├── card.tsx (shadcn)
    ├── sheet.tsx (shadcn)
    ├── alert-dialog.tsx (shadcn)
    ├── sonner.tsx (shadcn)
    ├── skeleton.tsx (shadcn)
    └── input.tsx (shadcn)

app/
├── landing-content.tsx
└── t/[threadId]/
    └── thread-content.tsx

hooks/
└── use-mobile.tsx (shadcn)
```

### Notes

- The sidebar uses shadcn's built-in cookie-based state persistence
- Mobile sidebar automatically uses a Sheet/drawer component
- Keyboard shortcut Cmd/Ctrl+B toggles the sidebar
- The `collapsible="icon"` mode is enabled for icon-only collapsed state
