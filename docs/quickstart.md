# RecallBricks SDK Quickstart

Get started with the RecallBricks TypeScript SDK in minutes.

## Installation

```bash
npm install recallbricks@2.1.0
```

Or with yarn:

```bash
yarn add recallbricks@2.1.0
```

## Environment Setup

Set your API key as an environment variable:

```bash
# .env file
RECALLBRICKS_API_KEY=your-api-key-here
RECALLBRICKS_BASE_URL=http://localhost:10002/api/v1  # Optional
```

## Basic Setup

```typescript
import { RecallBricks } from 'recallbricks';

// Initialize the client
const client = new RecallBricks({
  apiKey: process.env.RECALLBRICKS_API_KEY,
  baseUrl: process.env.RECALLBRICKS_BASE_URL, // Optional, defaults to localhost
  timeout: 30000,    // Optional, defaults to 30s
  maxRetries: 3,     // Optional, defaults to 3
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | - | API key for authentication (required if `serviceToken` not provided) |
| `serviceToken` | `string` | - | Service token for server-to-server auth (required if `apiKey` not provided) |
| `baseUrl` | `string` | `http://localhost:10002/api/v1` | Base URL for the API |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `3` | Maximum retry attempts for failed requests |
| `retryDelay` | `number` | `1000` | Initial retry delay in milliseconds |
| `maxRetryDelay` | `number` | `10000` | Maximum retry delay in milliseconds |

## First Memory: Save and Recall

### Save a Memory

```typescript
import { RecallBricks } from 'recallbricks';

const client = new RecallBricks({
  apiKey: process.env.RECALLBRICKS_API_KEY,
});

// Create a memory
const memory = await client.createMemory('User prefers dark mode for the interface', {
  tags: ['preference', 'ui', 'settings'],
  metadata: {
    userId: 'user-123',
    source: 'settings-page',
    confidence: 1.0
  }
});

console.log(`Created memory: ${memory.id}`);
console.log(`Text: ${memory.text}`);
console.log(`Created at: ${memory.created_at}`);
```

### Search for Memories

```typescript
// Semantic search
const results = await client.search('user interface preferences', {
  limit: 5,
  threshold: 0.7,
  tags: ['preference']
});

console.log(`Found ${results.results.length} matching memories`);

results.results.forEach(result => {
  console.log(`[${result.score.toFixed(2)}] ${result.memory.text}`);
});
```

### List All Memories

```typescript
// List memories with pagination
const list = await client.listMemories({
  limit: 10,
  offset: 0,
  sort: 'desc',
  sortBy: 'created_at'
});

console.log(`Total memories: ${list.total}`);
list.memories.forEach(mem => {
  console.log(`- ${mem.text}`);
});
```

### Update a Memory

```typescript
const updated = await client.updateMemory(memory.id, {
  text: 'User strongly prefers dark mode for all interfaces',
  tags: ['preference', 'ui', 'settings', 'important'],
  metadata: { confidence: 1.0, verified: true }
});

console.log(`Updated at: ${updated.updated_at}`);
```

### Delete a Memory

```typescript
await client.deleteMemory(memory.id);
console.log('Memory deleted');
```

## Graph Relationships

```typescript
// Get relationships for a memory
const relationships = await client.getRelationships(memory.id);
console.log(`Outgoing: ${relationships.outgoing.length}`);
console.log(`Incoming: ${relationships.incoming.length}`);

// Get graph context around a memory
const graph = await client.getGraphContext(memory.id, 3);
console.log(`Found ${graph.total_nodes} related nodes`);
```

## Autonomous Agent Features (v2.1.0)

The SDK includes specialized clients for building autonomous AI agents:

```typescript
// Access autonomous features through the main client
const session = await client.workingMemory.createSession({
  namespace: 'my-agent',
  capacity: 7
});

const goal = await client.goals.create({
  namespace: 'my-project',
  title: 'Complete feature implementation',
  type: 'achievement'
});

const results = await client.hybridSearch.hybrid('error handling', {
  limit: 10,
  semanticWeight: 0.6
});
```

See [Autonomous Features](./autonomous-features.md) for full documentation.

## Error Handling

```typescript
import { RecallBricks, RecallBricksError } from 'recallbricks';

try {
  const memory = await client.createMemory('test');
} catch (error) {
  if (error instanceof RecallBricksError) {
    console.error(`Error ${error.statusCode}: ${error.message}`);
    console.error(`Code: ${error.code}`);
    console.error(`Details:`, error.details);
  }
}
```

## Service Token Authentication

For server-to-server communication, use service tokens:

```typescript
const client = new RecallBricks({
  serviceToken: process.env.RECALLBRICKS_SERVICE_TOKEN,
});

// When using service tokens, userId is required for user-scoped operations
const memory = await client.createMemory('User data', {
  userId: 'user-123',  // Required with service token
  tags: ['user-data']
});
```

## Next Steps

- [API Reference](./api-reference.md) - Full method documentation
- [Autonomous Features](./autonomous-features.md) - Build intelligent agents
- [Examples](./examples.md) - Working code examples
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
