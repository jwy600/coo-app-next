import { Button } from '@/components/ui/Button';

/**
 * Server-compatible ErrorMessage component
 * Displays error state with optional retry
 * Reference: legacy/app.js lines 631-658
 */
interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex gap-3">
      <span className="text-sm font-medium text-gray-700">Coo</span>
      <div className="flex-1">
        <p className="text-sm text-red-600 mb-2">{error}</p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
