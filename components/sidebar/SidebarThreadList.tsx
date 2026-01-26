'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import type { Thread } from '@/types/thread';

interface SidebarThreadListProps {
  threads: Thread[];
}

export function SidebarThreadList({ threads }: SidebarThreadListProps) {
  const params = useParams();
  const currentThreadId = params?.threadId as string | undefined;
  const { setOpen, isMobile, state } = useSidebar();
  const isCollapsed = state === 'collapsed';

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
                <FileText className="h-4 w-4" />
                <span className="truncate">{thread.title || 'Untitled'}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
