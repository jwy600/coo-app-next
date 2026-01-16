// Chat API Types
export interface ChatRequest {
  prompt: string;
  threadId?: string;
  mode?: 'chat';
}

export interface ChatResponse {
  text: string;
}

// Block Action API Types
export type BlockAction = 'translate' | 'example' | 'expand' | 'eli5' | 'rewrite' | 'ask';

export interface BlockActionRequest {
  action: BlockAction;
  blockText: string;
  prompt?: string;
  mode?: 'block';
}

export interface BlockActionResponse {
  text: string;
}

// Config API Types
export interface ConfigResponse {
  supabaseUrl: string;
  supabaseAnonKey: string;
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
