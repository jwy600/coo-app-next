"use client";

import { ChatContainer } from "@/components/chat/ChatContainer";

interface ThreadContentProps {
  threadId: string;
}

export function ThreadContent({ threadId }: ThreadContentProps) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ChatContainer threadId={threadId} />
    </div>
  );
}
