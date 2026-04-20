# @lobechat/chat-sdk

> LobeHub Chat SDK - Reusable chat components and logic extracted from LobeHub monorepo

## 📦 Installation

```bash
pnpm add @lobechat/chat-sdk
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { ChatClient } from '@lobechat/chat-sdk';

// Initialize the client
const client = new ChatClient({
  apiUrl: 'https://api.lobehub.com',
  apiKey: 'your-api-key',
  debug: true, // Enable debug logging
});

// Send a message
const message = await client.sendMessage({
  sessionId: 'session-123',
  content: 'Hello, AI!',
});

// Get messages
const messages = await client.getMessages('session-123');

// Subscribe to message updates
const unsubscribe = client.subscribeToMessages(
  'session-123',
  (newMessage) => {
    console.log('New message:', newMessage);
  }
);

// Clean up when done
unsubscribe();
client.destroy();
```

### React Integration

```tsx
import { useEffect, useState } from 'react';
import { ChatClient } from '@lobechat/chat-sdk';

function ChatComponent() {
  const [messages, setMessages] = useState([]);
  const [client] = useState(() => new ChatClient({
    apiUrl: process.env.NEXT_PUBLIC_API_URL!,
    apiKey: process.env.NEXT_PUBLIC_API_KEY,
  }));

  useEffect(() => {
    // Load initial messages
    client.getMessages('session-123').then(setMessages);

    // Subscribe to updates
    const unsubscribe = client.subscribeToMessages(
      'session-123',
      (message) => {
        setMessages((prev) => [...prev, message]);
      }
    );

    return () => {
      unsubscribe();
      client.destroy();
    };
  }, [client]);

  const handleSend = async (content: string) => {
    await client.sendMessage({
      sessionId: 'session-123',
      content,
    });
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <button onClick={() => handleSend('Hello!')}>Send</button>
    </div>
  );
}
```

## 📚 API Reference

### ChatClient

#### Constructor

```typescript
new ChatClient(config: ChatSDKConfig)
```

**Parameters:**
- `config.apiUrl` (string) - API base URL
- `config.apiKey` (string, optional) - API key for authentication
- `config.debug` (boolean, optional) - Enable debug logging
- `config.headers` (Record<string, string>, optional) - Custom headers

#### Methods

##### `sendMessage(params: SendMessageParams): Promise<UIChatMessage>`

Send a message to a chat session.

**Parameters:**
- `params.sessionId` (string) - Session ID
- `params.content` (string) - Message content
- `params.files` (File[], optional) - Attached files
- `params.parentId` (string, optional) - Parent message ID (for replies)

**Returns:** The created message

##### `getMessages(sessionId: string): Promise<UIChatMessage[]>`

Get all messages from a session.

**Parameters:**
- `sessionId` (string) - Session ID

**Returns:** Array of messages

##### `getSession(sessionId: string): Promise<Session>`

Get session information.

**Parameters:**
- `sessionId` (string) - Session ID

**Returns:** Session object

##### `subscribeToMessages(sessionId: string, callback: MessageStreamCallback): () => void`

Subscribe to message updates for a session.

**Parameters:**
- `sessionId` (string) - Session ID
- `callback` (MessageStreamCallback) - Callback function called on each message update

**Returns:** Unsubscribe function

##### `destroy(): void`

Clean up resources and remove all subscriptions.

## 🏗️ Architecture

The Chat SDK is organized into modules:

```
@lobechat/chat-sdk/
├── core/           # Core client and types
├── state/          # Zustand store (coming soon)
├── services/       # API services (coming soon)
├── ui/             # React components (coming soon)
└── adapters/       # Platform adapters (coming soon)
```

## 🔧 Development

### Build

```bash
pnpm build
```

### Development Mode

```bash
pnpm dev
```

### Testing

```bash
pnpm test
pnpm test:coverage
```

### Type Checking

```bash
pnpm type-check
```

## 📝 License

MIT © LobeHub
