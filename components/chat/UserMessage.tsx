import { Message } from '@/types/message';

interface UserMessageProps {
  message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="user-message" data-message-id={message.id}>
      <span className="user-label">You</span>
      <p>{message.text}</p>
    </div>
  );
}
