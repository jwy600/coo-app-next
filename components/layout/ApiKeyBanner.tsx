"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store/useStore";

export function ApiKeyBanner() {
  const apiKey = useStore((state) => state.settings.apiKey);

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical SSR-safe mount flag
    setHasMounted(true);
  }, []);

  if (!hasMounted || apiKey) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-muted/80 px-4 py-2 text-center text-sm text-muted-foreground backdrop-blur">
      Add your OpenAI API key in <span className="font-medium">Settings</span>{" "}
      to start chatting.
    </div>
  );
}
