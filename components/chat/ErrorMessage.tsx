import { Button } from '@/components/ui/button';

/**
 * ErrorMessage component - Displays error state with optional retry
 * Uses shadcn Button for retry action
 */
interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div className="assistant-message">
      <span className="assistant-label">Coo</span>
      <div className="py-4 grid gap-2">
        <p className="text-sm text-foreground">{error}</p>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="justify-self-start"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
