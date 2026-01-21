/**
 * Server-compatible ComposerHint component
 * Static hint text below composer using shadcn semantic colors
 */
export function ComposerHint() {
  return (
    <p className="text-xs text-muted-foreground mt-2 flex-shrink-0">
      Tip: click a 6-dot handle to focus a paragraph in block mode.
    </p>
  );
}
