'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { useStore } from '@/lib/store/useStore';
import type { Thread } from '@/types/thread';

interface SidebarThreadListProps {
  threads: Thread[];
}

export function SidebarThreadList({ threads: serverThreads }: SidebarThreadListProps) {
  const params = useParams();
  const currentThreadId = params?.threadId as string | undefined;
  const { setOpen, isMobile, state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Track hydration state to avoid mismatch
  const [hasMounted, setHasMounted] = useState(false);

  // Subscribe to store threads for reactivity (title updates, new threads)
  const storeThreads = useStore((state) => state.threads);
  const mergeThreadFromSupabase = useStore((state) => state.mergeThreadFromSupabase);
  const hasSynced = useRef(false);

  // Mark as mounted after hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Sync server threads to store on mount (once)
  useEffect(() => {
    if (hasSynced.current || serverThreads.length === 0) return;
    hasSynced.current = true;

    // Merge server threads into the store (preserves any local changes)
    serverThreads.forEach((thread) => {
      mergeThreadFromSupabase(thread, thread.messages, []);
    });
  }, [serverThreads, mergeThreadFromSupabase]);

  // Use server threads for SSR/initial render, then switch to store threads after mount
  // This prevents hydration mismatch while keeping reactivity for title updates
  // Filter out empty threads (the default "Main" thread created by store initialization)
  // to avoid showing placeholder threads when database is empty
  const rawThreads = hasMounted ? storeThreads : serverThreads;
  const threads = rawThreads.filter((thread) => thread.messages.length > 0);

  const handleClick = () => {
    // On mobile, close the sidebar when navigating
    if (isMobile) {
      setOpen(false);
    }
  };

  if (!threads || threads.length === 0) {
    // Hide empty state text when sidebar is collapsed
    if (isCollapsed) {
      return null;
    }
    return (
      <div className="px-2 py-4 text-sm text-muted-foreground">
        No threads yet
      </div>
    );
  }

  return (
    <SidebarMenu>
      {threads.map((thread) => {
        const isActive = currentThreadId === thread.id;
        return (
          <SidebarMenuItem key={thread.id}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={thread.title || 'Untitled'}
            >
              <Link href={`/t/${thread.id}`} onClick={handleClick}>
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">{thread.title || 'Untitled'}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
