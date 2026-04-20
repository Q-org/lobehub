/**
 * Chat SDK Core Types
 */

import type { UIChatMessage, Session } from '@lobechat/types';

/**
 * Chat SDK Configuration
 */
export interface ChatSDKConfig {
  /** API Base URL */
  apiUrl: string;
  /** API Key for authentication */
  apiKey?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Send Message Parameters
 */
export interface SendMessageParams {
  sessionId: string;
  content: string;
  files?: File[];
  parentId?: string;
}

/**
 * Message Stream Callback
 */
export type MessageStreamCallback = (message: UIChatMessage) => void;

/**
 * Chat Client Events
 */
export interface ChatClientEvents {
  onMessageUpdate?: MessageStreamCallback;
  onSessionChange?: (session: Session) => void;
  onError?: (error: Error) => void;
}

/**
 * Chat Client Interface
 */
export interface IChatClient {
  config: ChatSDKConfig;
  
  sendMessage(params: SendMessageParams): Promise<UIChatMessage>;
  getMessages(sessionId: string): Promise<UIChatMessage[]>;
  getSession(sessionId: string): Promise<Session>;
  subscribeToMessages(sessionId: string, callback: MessageStreamCallback): () => void;
  
  destroy(): void;
}
