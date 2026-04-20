/**
 * LobeHub Chat SDK
 * 
 * A reusable chat SDK extracted from LobeHub monorepo.
 * Provides chat functionality that can be integrated into any React application.
 * 
 * @example
 * ```typescript
 * import { ChatClient } from '@lobechat/chat-sdk';
 * 
 * const client = new ChatClient({
 *   apiUrl: 'https://api.lobehub.com',
 *   apiKey: 'your-api-key',
 * });
 * 
 * // Send a message
 * await client.sendMessage({
 *   sessionId: 'session-123',
 *   content: 'Hello!',
 * });
 * 
 * // Get messages
 * const messages = await client.getMessages('session-123');
 * ```
 * 
 * @packageDocumentation
 */

// Core
export { ChatClient } from './core';
export type {
  ChatSDKConfig,
  SendMessageParams,
  MessageStreamCallback,
  ChatClientEvents,
  IChatClient,
} from './core';

// State (will be implemented)
// export { useChatStore } from './state';

// Services (will be implemented)
// export { MessageService, SessionService } from './services';

// UI Components (will be implemented)
// export { ChatWindow, MessageList, MessageInput } from './ui';
