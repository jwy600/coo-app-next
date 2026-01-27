'use client';

import { Settings } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SettingsForm } from './SettingsForm';

export function SettingsSheet() {
  return (
    <Sheet>
      <SidebarMenu>
        <SidebarMenuItem>
          <SheetTrigger asChild>
            <SidebarMenuButton>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SheetTrigger>
        </SidebarMenuItem>
      </SidebarMenu>
      <SheetContent side="right" className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Configure model, reasoning, and search options.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
          <SettingsForm />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
