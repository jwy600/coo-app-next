"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store/useStore";
import { signOut } from "@/lib/supabase/auth";
import {
  TRANSLATE_TO_RESPONSE_MAP,
  SYSTEM_PROMPT_OPTIONS,
} from "@/types/settings";
import type {
  SystemPromptFile,
  ModelType,
  ReasoningEffort,
  ResponseLanguage,
  TranslateLanguage,
  ExportDestination,
} from "@/types/settings";

const MODEL_OPTIONS: {
  value: ModelType;
  label: string;
  description: string;
}[] = [
  {
    value: "gpt-5-mini",
    label: "GPT-5-mini",
    description: "Fast and efficient",
  },
  { value: "gpt-5.2", label: "GPT-5.2", description: "Most capable" },
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
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const settings = useStore((state) => state.settings);
  const updateSystemPromptFile = useStore(
    (state) => state.updateSystemPromptFile,
  );
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
  const resetSettings = useStore((state) => state.resetSettings);
  const resetStore = useStore((state) => state.reset);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const result = await signOut();
    if (result.success) {
      resetStore();
      router.push("/auth/login");
      router.refresh();
    }
    setIsLoggingOut(false);
  };

  // Filter translate options to exclude the current response language (prevents conflict)
  const filteredTranslateOptions = ALL_TRANSLATE_OPTIONS.filter(
    (opt) => TRANSLATE_TO_RESPONSE_MAP[opt.value] !== settings.responseLanguage,
  );

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Model Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Model</Label>
        <RadioGroup
          value={settings.model}
          onValueChange={(value) => updateModel(value as ModelType)}
          className="grid gap-2"
        >
          {MODEL_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem
                value={option.value}
                id={`model-${option.value}`}
              />
              <Label
                htmlFor={`model-${option.value}`}
                className="flex flex-col cursor-pointer font-normal"
              >
                <span>{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      {/* System Prompt */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">System Prompt</Label>
        <RadioGroup
          value={settings.systemPromptFile}
          onValueChange={(value) =>
            updateSystemPromptFile(value as SystemPromptFile)
          }
          className="grid gap-2"
        >
          {Object.entries(SYSTEM_PROMPT_OPTIONS).map(([key, option]) => (
            <div key={key} className="flex items-center space-x-3">
              <RadioGroupItem value={key} id={`prompt-${key}`} />
              <Label
                htmlFor={`prompt-${key}`}
                className="flex flex-col cursor-pointer font-normal"
              >
                <span>{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      {/* Reasoning Effort */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Reasoning Effort</Label>
        <RadioGroup
          value={settings.reasoningEffort}
          onValueChange={(value) =>
            updateReasoningEffort(value as ReasoningEffort)
          }
          className="grid grid-cols-2 gap-2"
        >
          {REASONING_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`reasoning-${option.value}`}
              />
              <Label
                htmlFor={`reasoning-${option.value}`}
                className="cursor-pointer font-normal"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      {/* Response Language */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Response Language</Label>
        <RadioGroup
          value={settings.responseLanguage}
          onValueChange={(value) =>
            updateResponseLanguage(value as ResponseLanguage)
          }
          className="grid grid-cols-2 gap-2"
        >
          {RESPONSE_LANGUAGE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`response-lang-${option.value}`}
              />
              <Label
                htmlFor={`response-lang-${option.value}`}
                className="cursor-pointer font-normal"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      {/* Translation Language */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Translation Language</Label>
        <RadioGroup
          value={settings.translateLanguage}
          onValueChange={(value) =>
            updateTranslateLanguage(value as TranslateLanguage)
          }
          className="grid grid-cols-2 gap-2"
        >
          {filteredTranslateOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`lang-${option.value}`}
              />
              <Label
                htmlFor={`lang-${option.value}`}
                className="cursor-pointer font-normal"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      {/* Web Search Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="web-search" className="text-sm font-semibold">
            Web Search
          </Label>
          <p className="text-xs text-muted-foreground">
            Allow AI to search the web
          </p>
        </div>
        <Switch
          id="web-search"
          checked={settings.webSearchEnabled}
          onCheckedChange={updateWebSearchEnabled}
        />
      </div>

      <Separator />

      {/* Export Destination */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Export Destination</Label>
        <RadioGroup
          value={settings.exportDestination}
          onValueChange={(value) =>
            updateExportDestination(value as ExportDestination)
          }
          className="grid gap-2"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="local" id="export-local" />
            <Label
              htmlFor="export-local"
              className="flex flex-col cursor-pointer font-normal"
            >
              <span>Local</span>
              <span className="text-xs text-muted-foreground">
                Browser download
              </span>
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="obsidian" id="export-obsidian" />
            <Label
              htmlFor="export-obsidian"
              className="flex flex-col cursor-pointer font-normal"
            >
              <span>Obsidian</span>
              <span className="text-xs text-muted-foreground">
                Open in Obsidian via URI
              </span>
            </Label>
          </div>
        </RadioGroup>
        {settings.exportDestination === "obsidian" && (
          <Input
            value={settings.obsidianVaultName ?? ""}
            onChange={(e) => updateObsidianVaultName(e.target.value)}
            placeholder="MyVault"
            className="mt-2"
          />
        )}
      </div>

      <Separator />

      {/* Reset Button */}
      <Button variant="outline" onClick={resetSettings} className="w-full">
        Reset to Defaults
      </Button>

      <Separator />

      {/* Logout Button */}
      <Button
        variant="destructive"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full"
      >
        {isLoggingOut ? "Signing out..." : "Sign out"}
      </Button>
    </div>
  );
}
