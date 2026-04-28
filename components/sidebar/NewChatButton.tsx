"use client";

import { useRouter } from "next/navigation";
import { SquarePen } from "lucide-react";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { useStore } from "@/lib/store/useStore";

export function NewChatButton() {
  const router = useRouter();
  const setMode = useStore((state) => state.setMode);
  const { setOpen, isMobile } = useSidebar();

  const handleNewChat = () => {
    setMode("landing");
    router.push("/");
    if (isMobile) setOpen(false);
  };

  return (
    <SidebarMenuButton
      onClick={handleNewChat}
      tooltip="New chat"
      className="w-full"
    >
      <SquarePen className="h-4 w-4" />
      <span>New chat</span>
    </SidebarMenuButton>
  );
}
