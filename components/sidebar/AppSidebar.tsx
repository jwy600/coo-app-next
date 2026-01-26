'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarLogo } from './SidebarLogo';
import { NewChatButton } from './NewChatButton';
import { SidebarThreadList } from './SidebarThreadList';
import { SettingsSheet } from '@/components/settings';
import type { Thread } from '@/types/thread';

interface AppSidebarProps {
  threads: Thread[];
}

export function AppSidebar({ threads }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="flex flex-row items-center justify-between">
        <SidebarLogo />
        {!isCollapsed && (
          <SidebarTrigger className="h-6 w-6" />
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <NewChatButton />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="flex-1">
          <SidebarGroupContent className="h-full">
            <ScrollArea className="h-full">
              <SidebarThreadList threads={threads} />
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SettingsSheet />
      </SidebarFooter>
    </Sidebar>
  );
}
