"use client";

import { Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SettingsForm, SettingsFooter } from "./SettingsForm";

export function SettingsSheet({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}) {
  return (
    <Sheet defaultOpen={defaultOpen}>
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
      <SheetContent
        side="right"
        className="w-[320px] sm:w-[400px] flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Enter your OpenAI API key and configure model options. Everything is
            stored locally in your browser.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="px-1">
            <SettingsForm />
          </div>
        </ScrollArea>
        <SettingsFooter />
      </SheetContent>
    </Sheet>
  );
}
