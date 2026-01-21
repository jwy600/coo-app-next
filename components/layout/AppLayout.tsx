'use client';

import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sidebar/AppSidebar';
import type { Thread } from '@/types/thread';

interface AppLayoutProps {
  children: ReactNode;
  threads: Thread[];
}

export function AppLayout({ children, threads }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar threads={threads} />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
