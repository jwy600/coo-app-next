import { AppLayout } from "@/components/layout/AppLayout";
import { ThreadContent } from "./thread-content";

interface ThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;
  return (
    <AppLayout>
      <ThreadContent threadId={threadId} />
    </AppLayout>
  );
}
