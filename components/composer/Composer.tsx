'use client';

import { FormEvent, useRef } from 'react';
import { Paperclip, X } from 'lucide-react';
import { PromptInput } from './PromptInput';
import { ComposerHint } from './ComposerHint';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store/useStore';
import { validateMarkdownFile } from '@/lib/utils/validation';

interface ComposerProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  disabled?: boolean;
}

export function Composer({
  prompt,
  onPromptChange,
  onSubmit,
  disabled = false,
}: ComposerProps) {
  const mode = useStore((s) => s.mode);
  const landingComposerMode = useStore((s) => s.landingComposerMode);
  const composerAttachment = useStore((s) => s.composerAttachment);
  const setLandingComposerMode = useStore((s) => s.setLandingComposerMode);
  const setComposerAttachment = useStore((s) => s.setComposerAttachment);
  const setError = useStore((s) => s.setError);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLanding = mode === 'landing';
  const isRead = isLanding && landingComposerMode === 'read';
  const sendDisabled = disabled || (isRead && !composerAttachment);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file twice still fires `change`.
    e.target.value = '';
    if (!file) return;

    const result = validateMarkdownFile(file);
    if (!result.valid) {
      setError(result.error ?? 'Invalid file.');
      return;
    }
    setError(null);
    try {
      const text = await file.text();
      setComposerAttachment({ fileName: file.name, text });
    } catch {
      setError("Couldn't read that file. Please try another.");
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="composer bg-background rounded-xl border border-border composer-shadow p-4 max-h-[50vh] flex flex-col overflow-hidden w-full"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown"
        onChange={handleFileChange}
        className="hidden"
        data-testid="md-file-input"
        aria-hidden="true"
        tabIndex={-1}
      />

      {isLanding && (
        <div className="flex gap-1 mb-3 flex-shrink-0" aria-label="Composer mode">
          <Button
            type="button"
            aria-pressed={landingComposerMode === 'chat'}
            variant={landingComposerMode === 'chat' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLandingComposerMode('chat')}
          >
            Chat
          </Button>
          <Button
            type="button"
            aria-pressed={landingComposerMode === 'read'}
            variant={landingComposerMode === 'read' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLandingComposerMode('read')}
          >
            Read
          </Button>
        </div>
      )}

      {isRead ? (
        <div className="flex gap-2 items-stretch flex-1 min-h-0">
          <div className="flex-1 min-h-0 min-w-0 flex items-center">
            {composerAttachment ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/40 text-sm max-w-full">
                <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">{composerAttachment.fileName}</span>
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={() => setComposerAttachment(null)}
                  className="text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Paperclip className="h-4 w-4" />
                Attach Markdown
              </Button>
            )}
          </div>
          <Button
            type="submit"
            variant="default"
            disabled={sendDisabled}
            className="flex-shrink-0 self-end"
          >
            <span>Send</span>
            <span aria-hidden="true" className="ml-1">
              →
            </span>
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 items-stretch flex-1 min-h-0">
          <div className="flex-1 min-h-0 min-w-0">
            <PromptInput
              value={prompt}
              onChange={onPromptChange}
              onSubmit={() => onSubmit(new Event('submit') as unknown as FormEvent)}
              disabled={disabled}
            />
          </div>
          <Button
            type="submit"
            variant="default"
            disabled={disabled}
            className="flex-shrink-0 self-end"
          >
            <span>Send</span>
            <span aria-hidden="true" className="ml-1">
              →
            </span>
          </Button>
        </div>
      )}

      {isRead ? (
        <p className="text-xs text-gray-500 mt-2 flex-shrink-0">
          Upload a Markdown file to read it and ask about any passage.
        </p>
      ) : (
        <ComposerHint />
      )}
    </form>
  );
}
