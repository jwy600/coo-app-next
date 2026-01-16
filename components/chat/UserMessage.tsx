import { Message } from '@/types/message';
import { Block } from '@/types/block';

/**
 * Server-compatible UserMessage component
 * Simple text display for user messages
 * Reference: legacy/app.js lines 660-676
 */
interface UserMessageProps {
  message: Message;
  block?: Block;
}

export function UserMessage({ message, block }: UserMessageProps) {
  const text = block?.text || '';

  return (
    <div className="flex gap-3">
      <span className="text-sm font-medium text-gray-500">You</span>
      <p className="text-base text-gray-900">{text}</p>
    </div>
  );
}
