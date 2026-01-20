/**
 * Server-compatible ComposerHint component
 * Static hint text below composer
 * Reference: legacy/index.html lines 69-71
 */
export function ComposerHint() {
  return (
    <p className="text-xs text-gray-500 mt-2 flex-shrink-0">
      Tip: click a 6-dot handle to focus a paragraph in block mode.
    </p>
  );
}
