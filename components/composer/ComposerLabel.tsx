/**
 * Server-compatible ComposerLabel component
 * Displays label based on mode
 * Reference: legacy/app.js lines 432-434
 */
interface ComposerLabelProps {
  mode: 'landing' | 'thread';
  hasBlockSelected: boolean;
}

export function ComposerLabel({ mode, hasBlockSelected }: ComposerLabelProps) {
  const label = hasBlockSelected
    ? 'Ask about the selected paragraph'
    : 'Ask coo anything';

  return (
    <label className="text-sm font-medium text-gray-700 block mb-2 flex-shrink-0" htmlFor="prompt">
      {label}
    </label>
  );
}
