'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/lib/store/useStore';
import type { ModelType, ReasoningEffort } from '@/types/settings';

const MODEL_OPTIONS: { value: ModelType; label: string; description: string }[] = [
  { value: 'gpt-5-mini', label: 'GPT-5-mini', description: 'Fast and efficient' },
  { value: 'gpt-5.2', label: 'GPT-5.2', description: 'Most capable' },
];

const REASONING_OPTIONS: { value: ReasoningEffort; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'Standard responses' },
  { value: 'low', label: 'Low', description: 'Light reasoning' },
  { value: 'medium', label: 'Medium', description: 'Balanced reasoning' },
  { value: 'high', label: 'High', description: 'Deep reasoning' },
];

export function SettingsForm() {
  const settings = useStore((state) => state.settings);
  const updateModel = useStore((state) => state.updateModel);
  const updateReasoningEffort = useStore((state) => state.updateReasoningEffort);
  const updateWebSearchEnabled = useStore((state) => state.updateWebSearchEnabled);
  const resetSettings = useStore((state) => state.resetSettings);

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Model Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Model</Label>
        <RadioGroup
          value={settings.model}
          onValueChange={(value) => updateModel(value as ModelType)}
          className="grid gap-2"
        >
          {MODEL_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem value={option.value} id={`model-${option.value}`} />
              <Label
                htmlFor={`model-${option.value}`}
                className="flex flex-col cursor-pointer"
              >
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      {/* Reasoning Effort */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Reasoning Effort</Label>
        <RadioGroup
          value={settings.reasoningEffort}
          onValueChange={(value) => updateReasoningEffort(value as ReasoningEffort)}
          className="grid gap-2"
        >
          {REASONING_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem value={option.value} id={`reasoning-${option.value}`} />
              <Label
                htmlFor={`reasoning-${option.value}`}
                className="flex flex-col cursor-pointer"
              >
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      {/* Web Search Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="web-search" className="text-sm font-medium">
            Web Search
          </Label>
          <p className="text-xs text-muted-foreground">
            Allow AI to search the web for current information
          </p>
        </div>
        <Switch
          id="web-search"
          checked={settings.webSearchEnabled}
          onCheckedChange={updateWebSearchEnabled}
        />
      </div>

      <Separator />

      {/* Reset Button */}
      <Button
        variant="outline"
        onClick={resetSettings}
        className="w-full"
      >
        Reset to Defaults
      </Button>
    </div>
  );
}
