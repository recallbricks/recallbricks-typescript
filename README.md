# RecallBricks TypeScript SDK

Enterprise-grade TypeScript SDK for the RecallBricks API. Build intelligent memory systems with semantic search, graph relationships, and persistent context.

## Features

- **Full TypeScript Support**: Complete type definitions for all API operations
- **Retry Logic**: Automatic exponential backoff for transient failures
- **Error Handling**: Comprehensive error types with detailed context
- **Timeout Configuration**: Configurable request timeouts
- **Production Ready**: 40+ tests covering unit, integration, edge cases, and security
- **Zero Dependencies**: Only axios for HTTP requests

## Installation

```bash
npm install recallbricks
```

Or with yarn:

```bash
yarn add recallbricks
```

## Quick Start

```typescript
import { RecallBricks } from 'recallbricks';

// Initialize the client
const client = new RecallBricks({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:10002/api/v1', // Optional, defaults to localhost
  timeout: 30000, // Optional, defaults to 30s
  maxRetries: 3, // Optional, defaults to 3
});

// Create a memory
const memory = await client.createMemory('User prefers dark mode', {
  tags: ['preference', 'ui'],
  metadata: { userId: '123', source: 'settings' }
});

console.log(`Created memory: ${memory.id}`);
```

## API Reference

### Client Configuration

```typescript
interface RecallBricksConfig {
  apiKey: string;              // Required: Your API key
  baseUrl?: string;            // Optional: API base URL
  timeout?: number;            // Optional: Request timeout in ms (default: 30000)
  maxRetries?: number;         // Optional: Max retry attempts (default: 3)
  retryDelay?: number;         // Optional: Initial retry delay in ms (default: 1000)
  maxRetryDelay?: number;      // Optional: Max retry delay in ms (default: 10000)
}
```

### Core Methods

#### createMemory(text, options?)

Create a new memory with optional metadata and tags.

```typescript
const memory = await client.createMemory('Important information', {
  tags: ['important', 'work'],
  metadata: {
    userId: '123',
    category: 'business'
  },
  timestamp: '2025-01-01T12:00:00Z' // Optional
});
```

**Parameters:**
- `text` (string): The content of the memory
- `options` (object, optional):
  - `tags` (string[]): Array of tags for categorization
  - `metadata` (object): Key-value pairs for additional context
  - `timestamp` (string): ISO 8601 timestamp

**Returns:** `Promise<Memory>`

---

#### listMemories(options?)

List memories with filtering and pagination.

```typescript
const result = await client.listMemories({
  limit: 10,
  offset: 0,
  tags: ['important'],
  metadata: { userId: '123' },
  sort: 'desc',
  sortBy: 'created_at'
});

console.log(`Found ${result.total} memories`);
result.memories.forEach(memory => {
  console.log(`- ${memory.text}`);
});
```

**Parameters:**
- `options` (object, optional):
  - `limit` (number): Max number of results
  - `offset` (number): Pagination offset
  - `tags` (string[]): Filter by tags
  - `metadata` (object): Filter by metadata
  - `sort` ('asc' | 'desc'): Sort order
  - `sortBy` (string): Field to sort by

**Returns:** `Promise<ListMemoriesResponse>`

---

#### search(query, options?)

Semantic search across memories.

```typescript
const results = await client.search('user preferences', {
  limit: 5,
  threshold: 0.7,
  tags: ['preference'],
  metadata: { userId: '123' }
});

results.results.forEach(result => {
  console.log(`[${result.score.toFixed(2)}] ${result.memory.text}`);
});
```

**Parameters:**
- `query` (string): Search query
- `options` (object, optional):
  - `limit` (number): Max results to return
  - `threshold` (number): Minimum similarity score (0-1)
  - `tags` (string[]): Filter by tags
  - `metadata` (object): Filter by metadata

**Returns:** `Promise<SearchResponse>`

---

#### getRelationships(memoryId)

Get all relationships (incoming and outgoing) for a memory.

```typescript
const relationships = await client.getRelationships('mem-123');

console.log(`Outgoing: ${relationships.outgoing.length}`);
relationships.outgoing.forEach(rel => {
  console.log(`  -> ${rel.target_id} (${rel.type}, strength: ${rel.strength})`);
});

console.log(`Incoming: ${relationships.incoming.length}`);
relationships.incoming.forEach(rel => {
  console.log(`  <- ${rel.source_id} (${rel.type}, strength: ${rel.strength})`);
});
```

**Parameters:**
- `memoryId` (string): ID of the memory

**Returns:** `Promise<RelationshipsResponse>`

---

#### getGraphContext(memoryId, depth?)

Get the graph context around a memory up to a specified depth.

```typescript
const graph = await client.getGraphContext('mem-123', 3);

console.log(`Root: ${graph.root_id}`);
console.log(`Total nodes: ${graph.total_nodes}`);

graph.nodes.forEach(node => {
  console.log(`[Depth ${node.depth}] ${node.memory.text}`);
  console.log(`  Relationships: ${node.relationships.length}`);
});
```

**Parameters:**
- `memoryId` (string): Root memory ID
- `depth` (number, optional): Max traversal depth (1-10, default: 2)

**Returns:** `Promise<GraphContextResponse>`

---

#### updateMemory(memoryId, updates)

Update an existing memory.

```typescript
const updated = await client.updateMemory('mem-123', {
  text: 'Updated text',
  tags: ['updated', 'important'],
  metadata: { version: 2 }
});

console.log(`Updated at: ${updated.updated_at}`);
```

**Parameters:**
- `memoryId` (string): ID of the memory to update
- `updates` (object): Fields to update
  - `text` (string, optional): New text content
  - `tags` (string[], optional): New tags
  - `metadata` (object, optional): New metadata

**Returns:** `Promise<Memory>`

---

#### deleteMemory(memoryId)

Delete a memory by ID.

```typescript
await client.deleteMemory('mem-123');
console.log('Memory deleted successfully');
```

**Parameters:**
- `memoryId` (string): ID of the memory to delete

**Returns:** `Promise<boolean>`

---

## Usage Examples

### Building a User Preference System

```typescript
import { RecallBricks } from 'recallbricks';

const client = new RecallBricks({ apiKey: process.env.RECALLBRICKS_API_KEY! });

// Store user preferences
async function savePreference(userId: string, preference: string, value: any) {
  return await client.createMemory(
    `User ${userId} set ${preference} to ${value}`,
    {
      tags: ['preference', preference],
      metadata: { userId, preference, value: String(value) }
    }
  );
}

// Retrieve user preferences
async function getUserPreferences(userId: string) {
  const results = await client.listMemories({
    tags: ['preference'],
    metadata: { userId },
    limit: 100
  });
  return results.memories;
}

// Find similar preferences across users
async function findSimilarPreferences(preferenceDescription: string) {
  const results = await client.search(preferenceDescription, {
    tags: ['preference'],
    threshold: 0.8,
    limit: 10
  });
  return results.results;
}
```

### Conversation Memory System

```typescript
// Store conversation turns
async function saveConversation(conversationId: string, role: string, content: string) {
  return await client.createMemory(content, {
    tags: ['conversation', role],
    metadata: {
      conversationId,
      role,
      timestamp: new Date().toISOString()
    }
  });
}

// Retrieve conversation history
async function getConversationHistory(conversationId: string) {
  const results = await client.listMemories({
    tags: ['conversation'],
    metadata: { conversationId },
    sort: 'asc',
    sortBy: 'created_at'
  });
  return results.memories;
}

// Find relevant context from past conversations
async function findRelevantContext(query: string, conversationId: string) {
  return await client.search(query, {
    tags: ['conversation'],
    metadata: { conversationId },
    threshold: 0.7,
    limit: 5
  });
}
```

### Knowledge Graph Exploration

```typescript
// Create interconnected memories
async function buildKnowledgeGraph() {
  const concept1 = await client.createMemory('Machine learning is a subset of AI', {
    tags: ['concept', 'ml', 'ai']
  });

  const concept2 = await client.createMemory('Deep learning uses neural networks', {
    tags: ['concept', 'deep-learning']
  });

  const concept3 = await client.createMemory('Neural networks mimic brain structure', {
    tags: ['concept', 'neural-networks']
  });

  return [concept1, concept2, concept3];
}

// Explore relationships
async function exploreRelationships(memoryId: string) {
  // Get immediate relationships
  const relationships = await client.getRelationships(memoryId);

  // Get broader context
  const graph = await client.getGraphContext(memoryId, 3);

  return { relationships, graph };
}
```

### Pagination Example

```typescript
async function getAllMemories() {
  const allMemories = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const result = await client.listMemories({ limit, offset });
    allMemories.push(...result.memories);
    offset += limit;
    hasMore = result.memories.length === limit;
  }

  return allMemories;
}
```

## Error Handling

The SDK uses a custom `RecallBricksError` class for all API errors:

```typescript
import { RecallBricksError } from 'recallbricks';

try {
  const memory = await client.createMemory('test');
} catch (error) {
  if (error instanceof RecallBricksError) {
    console.error(`Error ${error.statusCode}: ${error.message}`);
    console.error(`Code: ${error.code}`);
    console.error(`Details:`, error.details);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Error Properties

- `message` (string): Human-readable error message
- `statusCode` (number): HTTP status code
- `code` (string): Error code from API
- `details` (unknown): Additional error details

## Retry Logic

The SDK automatically retries failed requests with exponential backoff for:

- Network errors (connection refused, timeout, etc.)
- 429 (Rate Limit Exceeded)
- 500+ (Server errors)

**Non-retryable errors** (fail immediately):
- 400 (Bad Request)
- 401 (Unauthorized)
- 403 (Forbidden)
- 404 (Not Found)

Configure retry behavior:

```typescript
const client = new RecallBricks({
  apiKey: 'your-api-key',
  maxRetries: 5,           // Max number of retry attempts
  retryDelay: 500,         // Initial delay in ms
  maxRetryDelay: 30000,    // Max delay in ms (caps exponential backoff)
});
```

## TypeScript Types

All types are exported from the main module:

```typescript
import {
  RecallBricks,
  RecallBricksConfig,
  RecallBricksError,
  Memory,
  CreateMemoryOptions,
  ListMemoriesOptions,
  ListMemoriesResponse,
  SearchOptions,
  SearchResponse,
  SearchResult,
  Relationship,
  RelationshipsResponse,
  GraphNode,
  GraphContextResponse,
  UpdateMemoryOptions,
  MemoryMetadata,
} from 'recallbricks';
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Lint
npm run lint
```

## Testing

The SDK includes comprehensive test coverage:

- **Unit Tests**: Client initialization, configuration, and individual methods
- **Integration Tests**: Full workflows and real-world scenarios
- **Edge Case Tests**: Boundary conditions, malformed data, and error scenarios
- **Security Tests**: Input validation, injection prevention, and data protection

Run tests:

```bash
npm test
```

View coverage report:

```bash
npm run test:coverage
```

## Requirements

- Node.js 16.0.0 or higher
- TypeScript 5.0+ (for development)

## License

MIT

## Support

For issues and feature requests, please file an issue on the project repository.

## Contributing

Contributions are welcome! Please ensure all tests pass and coverage remains high:

```bash
npm test
npm run test:coverage
```
