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
    <div className="assistant-message">
      <span className="assistant-label">Coo</span>
      <div className="assistant-error">
        <p>{error}</p>
        {onRetry && (
          <button type="button" className="assistant-retry" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
