"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const updateObsidianVaultPath = useStore(
    (state) => state.updateObsidianVaultPath,
  );

  // Filter translate options to exclude the current response language (prevents conflict)
  const filteredTranslateOptions = ALL_TRANSLATE_OPTIONS.filter(
    (opt) => TRANSLATE_TO_RESPONSE_MAP[opt.value] !== settings.responseLanguage,
  );

  return (
    <div className="flex flex-col gap-5 py-4">
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

      <div className="space-y-2">
        <Label className="text-sm font-medium">System Prompt</Label>
          <RadioGroup
            value={settings.systemPromptFile}
            onValueChange={(value) =>
              updateSystemPromptFile(value as SystemPromptFile)
            }
            className="grid gap-2"
          >
            {Object.entries(SYSTEM_PROMPT_OPTIONS).map(([key, option]) => (
              <label
                key={key}
                htmlFor={`prompt-${key}`}
                className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  settings.systemPromptFile === key
                    ? "border-foreground/20 bg-accent"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value={key} id={`prompt-${key}`} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </label>
            ))}
          </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Export Destination</Label>
          <RadioGroup
            value={settings.exportDestination}
            onValueChange={(value) =>
              updateExportDestination(value as ExportDestination)
            }
            className="grid gap-2"
          >
            <label
              htmlFor="export-local"
              className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                settings.exportDestination === "local"
                  ? "border-foreground/20 bg-accent"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="local" id="export-local" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Local</span>
                <span className="text-xs text-muted-foreground">
                  Browser download
                </span>
              </div>
            </label>
            <label
              htmlFor="export-obsidian"
              className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                settings.exportDestination === "obsidian"
                  ? "border-foreground/20 bg-accent"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="obsidian" id="export-obsidian" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Obsidian</span>
                <span className="text-xs text-muted-foreground">
                  Save to vault folder
                </span>
              </div>
            </label>
          </RadioGroup>
          {settings.exportDestination === "obsidian" && (
            <Input
              value={settings.obsidianVaultPath ?? ""}
              onChange={(e) => updateObsidianVaultPath(e.target.value)}
              placeholder="/Users/you/ObsidianVault"
              className="mt-2"
            />
          )}
      </div>
    </div>
  );
}

export function SettingsFooter() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  return (
    <div className="space-y-3 pt-3">
      <Separator />
      <div className="flex flex-col gap-2 px-1">
        <Button variant="outline" onClick={resetSettings} className="w-full">
          Reset to Defaults
        </Button>
        <Button
          variant="outline"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full"
        >
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </div>
  );
}
