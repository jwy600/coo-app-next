"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store/useStore";
import { TRANSLATE_TO_RESPONSE_MAP } from "@/types/settings";
import type {
  ModelType,
  ReasoningEffort,
  ResponseLanguage,
  TranslateLanguage,
} from "@/types/settings";

const MODEL_OPTIONS: {
  value: ModelType;
  label: string;
  description: string;
}[] = [
  {
    value: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    description: "Fast and efficient",
  },
  {
    value: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    description: "Most capable",
  },
  { value: "gpt-5.6-sol", label: "GPT-5.6 Sol", description: "Latest flagship" },
];

const REASONING_OPTIONS: { value: ReasoningEffort; label: string }[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const RESPONSE_LANGUAGE_OPTIONS: { value: ResponseLanguage; label: string }[] =
  [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "zh", label: "中文" },
    { value: "ja", label: "日本語" },
  ];

const ALL_TRANSLATE_OPTIONS: { value: TranslateLanguage; label: string }[] = [
  { value: "English", label: "English" },
  { value: "Chinese", label: "中文" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "Japanese", label: "日本語" },
];


export function SettingsForm() {
  const settings = useStore((state) => state.settings);
  const updateApiKey = useStore((state) => state.updateApiKey);
  const updateModel = useStore((state) => state.updateModel);
  const updateReasoningEffort = useStore(
    (state) => state.updateReasoningEffort,
  );
  const updateWebSearchEnabled = useStore(
    (state) => state.updateWebSearchEnabled,
  );
  const updateResponseLanguage = useStore(
    (state) => state.updateResponseLanguage,
  );
  const updateTranslateLanguage = useStore(
    (state) => state.updateTranslateLanguage,
  );
  const updateExportDestination = useStore(
    (state) => state.updateExportDestination,
  );
  const updateObsidianVaultName = useStore(
    (state) => state.updateObsidianVaultName,
  );

  const filteredTranslateOptions = ALL_TRANSLATE_OPTIONS.filter(
    (opt) => TRANSLATE_TO_RESPONSE_MAP[opt.value] !== settings.responseLanguage,
  );

  const handleVaultNameChange = (value: string) => {
    updateObsidianVaultName(value);
    updateExportDestination(value.trim() ? "obsidian" : "local");
  };

  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="space-y-2">
        <Label htmlFor="api-key" className="text-sm font-medium">
          OpenAI API Key
        </Label>
        <Input
          id="api-key"
          type="password"
          autoComplete="off"
          value={settings.apiKey}
          onChange={(e) => updateApiKey(e.target.value)}
          placeholder="sk-..."
        />
        <p className="text-xs text-muted-foreground">
          Stored locally in your browser. Never sent to any server besides OpenAI.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="obsidian-vault" className="text-sm font-medium">
          Obsidian Vault Name
        </Label>
        <Input
          id="obsidian-vault"
          type="text"
          autoComplete="off"
          value={settings.obsidianVaultName ?? ""}
          onChange={(e) => handleVaultNameChange(e.target.value)}
          placeholder="MyVault"
        />
        <p className="text-xs text-muted-foreground">
          Fill this in to send exported threads and cards straight to your
          Obsidian vault. Leave empty to download them as Markdown files
          instead.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Response Language</Label>
          <Select
            value={settings.responseLanguage}
            onValueChange={(value) =>
              updateResponseLanguage(value as ResponseLanguage)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESPONSE_LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Translation Language</Label>
          <Select
            value={settings.translateLanguage}
            onValueChange={(value) =>
              updateTranslateLanguage(value as TranslateLanguage)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filteredTranslateOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Model</Label>
          <div className="flex gap-1">
            {MODEL_OPTIONS.map((option) => {
              const selected = settings.model === option.value;
              return (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`flex-1 justify-start ${selected ? "bg-accent" : ""}`}
                  onClick={() => updateModel(option.value)}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Reasoning</Label>
          <div className="flex gap-1">
            {REASONING_OPTIONS.map((option) => {
              const selected = settings.reasoningEffort === option.value;
              return (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`flex-1 justify-start ${selected ? "bg-accent" : ""}`}
                  onClick={() => updateReasoningEffort(option.value)}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Web Search</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={`flex-1 justify-start ${!settings.webSearchEnabled ? "bg-accent" : ""}`}
              onClick={() => updateWebSearchEnabled(false)}
            >
              Off
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={`flex-1 justify-start ${settings.webSearchEnabled ? "bg-accent" : ""}`}
              onClick={() => updateWebSearchEnabled(true)}
            >
              On
            </Button>
          </div>
      </div>

    </div>
  );
}

export function SettingsFooter({ onSave }: { onSave: () => void }) {
  const resetSettings = useStore((state) => state.resetSettings);
  // The API key is the only required field; everything else has a default.
  const apiKey = useStore((state) => state.settings.apiKey);
  const canSave = apiKey.trim().length > 0;

  return (
    <div className="space-y-3 pt-3">
      <Separator />
      <div className="flex flex-col gap-2 px-1">
        <Button onClick={onSave} disabled={!canSave} className="w-full">
          Save
        </Button>
        <Button variant="outline" onClick={resetSettings} className="w-full">
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
