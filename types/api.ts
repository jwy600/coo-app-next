import type { Settings, TranslateLanguage } from './settings';

// Chat API Types
export interface ChatRequest {
  prompt: string;
  threadId?: string;
  mode?: 'thread';
  previousResponseId?: string;
  stream?: boolean;
  settings?: Settings;
}

export interface ChatResponse {
  text: string;
  responseId?: string;
}

// Block Action API Types
export type BlockAction =
  | 'translate'
  | 'example'
  | 'expand'
  | 'eli5'
  | 'summarize'
  | 'rewrite'
  | 'ask';

export interface BlockActionRequest {
  action: BlockAction;
  blockText: string;
  prompt?: string;
  mode?: 'block';
  translateLanguage?: TranslateLanguage;
  settings?: Settings;
}

export interface BlockActionResponse {
  text: string;
  responseId: string;
}

// Error Response
export interface ApiError {
  error: string;
  details?: string;
}
