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
export type BlockAction = 'translate' | 'example' | 'expand' | 'eli5' | 'rewrite' | 'ask';

export interface BlockActionRequest {
  action: BlockAction;
  blockText: string;
  prompt?: string;
  mode?: 'block';
  translateLanguage?: TranslateLanguage;
}

export interface BlockActionResponse {
  text: string;
}

// Config API Types
export interface ConfigResponse {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

// Thread Title API Types
export interface TitleRequest {
  prompt: string;
  response?: string;
}

export interface TitleResponse {
  title: string;
}

// Error Response
export interface ApiError {
  error: string;
  details?: string;
}

// Type guards
export function isApiError(response: any): response is ApiError {
  return 'error' in response;
}
