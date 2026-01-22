/**
 * Server-compatible ComposerHint component
 * Static hint text below composer (only shown in chat mode)
 * Reference: legacy/index.html lines 69-71
 */
interface ComposerHintProps {
  hidden?: boolean;
}

export function ComposerHint({ hidden = false }: ComposerHintProps) {
  if (hidden) return null;

  return (
    <p className="text-xs text-gray-500 mt-2 flex-shrink-0">
      Tip: click the 4-dot handle to focus a block.
    </p>
  );
}
