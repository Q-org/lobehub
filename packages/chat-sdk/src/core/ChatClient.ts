/**
 * Chat Client - Main entry point for Chat SDK
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import debug from 'debug';

import type {
  ChatSDKConfig,
  IChatClient,
  MessageStreamCallback,
  SendMessageParams,
} from './types';
import type { UIChatMessage } from '@lobechat/types';

const log = debug('chat-sdk:client');

export class ChatClient implements IChatClient {
  public config: ChatSDKConfig;
  private trpcClient: any; // Will be typed when used with actual tRPC router
  private subscriptions: Map<string, Set<MessageStreamCallback>>;

  constructor(config: ChatSDKConfig) {
    this.config = config;
    this.subscriptions = new Map();

    // Initialize tRPC client
    // Note: In real usage, you'll need to provide the actual AppRouter type
    this.trpcClient = createTRPCProxyClient({
      links: [
        httpBatchLink({
          url: config.apiUrl,
          headers: () => ({
            Authorization: config.apiKey ? `Bearer ${config.apiKey}` : undefined,
            ...config.headers,
          }),
        }),
      ],
    });

    if (config.debug) {
      debug.enable('chat-sdk:*');
    }

    log('ChatClient initialized with apiUrl:', config.apiUrl);
  }

  /**
   * Send a message to the chat session
   */
  async sendMessage(params: SendMessageParams): Promise<UIChatMessage> {
    log('Sending message to session:', params.sessionId);

    try {
      const result = await this.trpcClient.message.send.mutate({
        sessionId: params.sessionId,
        content: params.content,
        files: params.files,
        parentId: params.parentId,
      });

      log('Message sent successfully:', result.id);
      
      // Notify subscribers
      this.notifySubscribers(params.sessionId, result);

      return result;
    } catch (error) {
      log('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Get messages from a chat session
   */
  async getMessages(sessionId: string): Promise<UIChatMessage[]> {
    log('Fetching messages for session:', sessionId);

    try {
      const messages = await this.trpcClient.message.list.query({
        sessionId,
      });

      log(`Fetched ${messages.length} messages`);
      return messages;
    } catch (error) {
      log('Failed to fetch messages:', error);
      throw error;
    }
  }

  /**
   * Get session information
   */
  async getSession(sessionId: string): Promise<any> {
    log('Fetching session:', sessionId);

    try {
      const session = await this.trpcClient.session.get.query({
        id: sessionId,
      });

      log('Session fetched:', session.id);
      return session;
    } catch (error) {
      log('Failed to fetch session:', error);
      throw error;
    }
  }

  /**
   * Subscribe to message updates for a session
   * Returns an unsubscribe function
   */
  subscribeToMessages(
    sessionId: string,
    callback: MessageStreamCallback,
  ): () => void {
    log('Subscribing to messages for session:', sessionId);

    if (!this.subscriptions.has(sessionId)) {
      this.subscriptions.set(sessionId, new Set());
    }

    const callbacks = this.subscriptions.get(sessionId)!;
    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(sessionId);
      }
      log('Unsubscribed from session:', sessionId);
    };
  }

  /**
   * Notify all subscribers of a message update
   */
  private notifySubscribers(sessionId: string, message: UIChatMessage): void {
    const callbacks = this.subscriptions.get(sessionId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          log('Error in subscriber callback:', error);
        }
      });
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    log('Destroying ChatClient');
    this.subscriptions.clear();
  }
}
