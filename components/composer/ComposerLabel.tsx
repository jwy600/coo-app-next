import { Label } from '@/components/ui/label';

/**
 * Server-compatible ComposerLabel component
 * Displays label based on mode using shadcn Label
 */
interface ComposerLabelProps {
  mode: 'landing' | 'chat';
  hasBlockSelected: boolean;
}

export function ComposerLabel({ mode, hasBlockSelected }: ComposerLabelProps) {
  const label = hasBlockSelected
    ? 'Ask about the selected paragraph'
    : 'Ask coo anything';

  return (
    <Label htmlFor="prompt" className="block mb-2 flex-shrink-0">
      {label}
    </Label>
  );
}
