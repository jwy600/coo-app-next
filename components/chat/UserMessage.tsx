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
    <div className="user-message">
      <span className="user-label">You</span>
      <p>{text}</p>
    </div>
  );
}
