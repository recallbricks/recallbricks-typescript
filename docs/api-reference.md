# RecallBricks SDK API Reference

Complete API documentation for the RecallBricks TypeScript SDK v2.1.0.

## Table of Contents

- [RecallBricks Class](#recallbricks-class)
  - [Constructor](#constructor)
  - [Core Memory Methods](#core-memory-methods)
  - [Metacognition Methods](#metacognition-methods)
- [Autonomous Clients](#autonomous-clients)
- [Types](#types)
- [Error Handling](#error-handling)

---

## RecallBricks Class

The main client class for interacting with the RecallBricks API.

### Constructor

```typescript
new RecallBricks(config: RecallBricksConfig)
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `apiKey` | `string` | Yes* | API key for authentication |
| `serviceToken` | `string` | Yes* | Service token for server-to-server auth |
| `baseUrl` | `string` | No | API base URL (default: `http://localhost:10002/api/v1`) |
| `timeout` | `number` | No | Request timeout in ms (default: `30000`) |
| `maxRetries` | `number` | No | Max retry attempts (default: `3`) |
| `retryDelay` | `number` | No | Initial retry delay in ms (default: `1000`) |
| `maxRetryDelay` | `number` | No | Max retry delay in ms (default: `10000`) |

*Either `apiKey` or `serviceToken` must be provided, but not both.

**Throws:** `RecallBricksError` if authentication is not properly configured.

---

## Core Memory Methods

### createMemory

Creates a new memory.

```typescript
createMemory(text: string, options?: CreateMemoryOptions): Promise<Memory>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | Yes | The text content of the memory |
| `options.userId` | `string` | No* | User ID (required with service token) |
| `options.metadata` | `MemoryMetadata` | No | Key-value metadata pairs |
| `options.tags` | `string[]` | No | Tags for categorization |
| `options.timestamp` | `string` | No | ISO 8601 timestamp |

**Returns:** `Promise<Memory>`

**Example:**
```typescript
const memory = await client.createMemory('User prefers dark mode', {
  tags: ['preference', 'ui'],
  metadata: { userId: '123', source: 'settings' }
});
```

---

### listMemories

Lists memories with optional filtering and pagination.

```typescript
listMemories(options?: ListMemoriesOptions): Promise<ListMemoriesResponse>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options.userId` | `string` | No* | User ID (required with service token) |
| `options.limit` | `number` | No | Max number of results |
| `options.offset` | `number` | No | Pagination offset |
| `options.tags` | `string[]` | No | Filter by tags |
| `options.metadata` | `MemoryMetadata` | No | Filter by metadata |
| `options.sort` | `'asc' \| 'desc'` | No | Sort order (default: `'desc'`) |
| `options.sortBy` | `string` | No | Field to sort by (default: `'created_at'`) |

**Returns:** `Promise<ListMemoriesResponse>`

**Example:**
```typescript
const result = await client.listMemories({
  limit: 10,
  offset: 0,
  tags: ['important'],
  sort: 'desc'
});
```

---

### search

Searches for memories using semantic search.

```typescript
search(query: string, options?: SearchOptions): Promise<SearchResponse>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | Yes | The search query |
| `options.userId` | `string` | No* | User ID (required with service token) |
| `options.limit` | `number` | No | Max results to return |
| `options.threshold` | `number` | No | Minimum similarity score (0-1) |
| `options.tags` | `string[]` | No | Filter by tags |
| `options.metadata` | `MemoryMetadata` | No | Filter by metadata |

**Returns:** `Promise<SearchResponse>`

**Example:**
```typescript
const results = await client.search('user preferences', {
  limit: 5,
  threshold: 0.7,
  tags: ['preference']
});
```

---

### getRelationships

Gets all relationships for a specific memory.

```typescript
getRelationships(memoryId: string): Promise<RelationshipsResponse>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `memoryId` | `string` | Yes | The memory ID |

**Returns:** `Promise<RelationshipsResponse>`

**Example:**
```typescript
const relationships = await client.getRelationships('memory-123');
console.log(`Outgoing: ${relationships.outgoing.length}`);
console.log(`Incoming: ${relationships.incoming.length}`);
```

---

### getGraphContext

Gets the graph context around a memory up to a specified depth.

```typescript
getGraphContext(memoryId: string, depth?: number): Promise<GraphContextResponse>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `memoryId` | `string` | Yes | The root memory ID |
| `depth` | `number` | No | Max traversal depth (1-10, default: `2`) |

**Returns:** `Promise<GraphContextResponse>`

**Example:**
```typescript
const graph = await client.getGraphContext('memory-123', 3);
console.log(`Found ${graph.total_nodes} related nodes`);
```

---

### updateMemory

Updates an existing memory.

```typescript
updateMemory(memoryId: string, updates: UpdateMemoryOptions): Promise<Memory>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `memoryId` | `string` | Yes | The memory ID to update |
| `updates.text` | `string` | No | New text content |
| `updates.metadata` | `MemoryMetadata` | No | New metadata |
| `updates.tags` | `string[]` | No | New tags |

**Returns:** `Promise<Memory>`

**Example:**
```typescript
const updated = await client.updateMemory('memory-123', {
  text: 'Updated text',
  tags: ['updated', 'important']
});
```

---

### deleteMemory

Deletes a memory by ID.

```typescript
deleteMemory(memoryId: string): Promise<boolean>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `memoryId` | `string` | Yes | The memory ID to delete |

**Returns:** `Promise<boolean>`

**Example:**
```typescript
await client.deleteMemory('memory-123');
```

---

## Metacognition Methods

### predictMemories

Predicts memories that might be needed based on context.

```typescript
predictMemories(options?: PredictMemoriesOptions): Promise<PredictMemoriesResponse>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options.userId` | `string` | No* | User ID (required with service token) |
| `options.context` | `string` | No | Context to base predictions on |
| `options.recentMemoryIds` | `string[]` | No | IDs of recent memories to analyze |
| `options.limit` | `number` | No | Max predictions to return |

**Returns:** `Promise<PredictMemoriesResponse>`

---

### suggestMemories

Suggests relevant memories based on context.

```typescript
suggestMemories(context: string, options?: SuggestMemoriesOptions): Promise<SuggestMemoriesResponse>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `context` | `string` | Yes | Context to base suggestions on |
| `options.userId` | `string` | No* | User ID (required with service token) |
| `options.limit` | `number` | No | Max suggestions to return |
| `options.minConfidence` | `number` | No | Min confidence threshold (0-1) |
| `options.includeReasoning` | `boolean` | No | Include reasoning in response |

**Returns:** `Promise<SuggestMemoriesResponse>`

---

### getLearningMetrics

Gets learning metrics for the system.

```typescript
getLearningMetrics(days?: number): Promise<LearningMetrics>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `days` | `number` | No | Number of days to analyze (default: `30`) |

**Returns:** `Promise<LearningMetrics>`

---

### getPatterns

Gets pattern analysis for memory access.

```typescript
getPatterns(days?: number): Promise<PatternAnalysis>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `days` | `number` | No | Number of days to analyze (default: `30`) |

**Returns:** `Promise<PatternAnalysis>`

---

### searchWeighted

Performs a weighted search combining semantic similarity with usage patterns.

```typescript
searchWeighted(query: string, options?: SearchWeightedOptions): Promise<SearchWeightedResponse>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | Yes | The search query |
| `options.userId` | `string` | No* | User ID (required with service token) |
| `options.limit` | `number` | No | Max results to return |
| `options.weightByUsage` | `boolean` | No | Weight by usage frequency |
| `options.decayOldMemories` | `boolean` | No | Apply decay to older memories |
| `options.adaptiveWeights` | `boolean` | No | Use adaptive weights |
| `options.minHelpfulnessScore` | `number` | No | Min helpfulness score |

**Returns:** `Promise<SearchWeightedResponse>`

---

## Autonomous Clients

The RecallBricks class exposes 9 specialized clients for autonomous agent features:

| Property | Client | Description |
|----------|--------|-------------|
| `workingMemory` | `WorkingMemoryClient` | Attention-based active memory |
| `prospectiveMemory` | `ProspectiveMemoryClient` | "Remember to remember" functionality |
| `metacognition` | `MetacognitionClient` | Self-assessment and performance tracking |
| `memoryTypes` | `MemoryTypesClient` | Episodic, semantic, procedural memories |
| `goals` | `GoalsClient` | Hierarchical objective tracking |
| `health` | `HealthClient` | Memory maintenance and quality |
| `uncertainty` | `UncertaintyClient` | Uncertainty quantification |
| `context` | `ContextClient` | Intelligent context building |
| `hybridSearch` | `SearchClient` | Advanced hybrid search |

See [Autonomous Features](./autonomous-features.md) for detailed documentation.

---

## Types

### Memory

```typescript
interface Memory {
  id: string;
  text: string;
  metadata?: MemoryMetadata;
  tags?: string[];
  created_at: string;
  updated_at: string;
  embedding?: number[];
}
```

### MemoryMetadata

```typescript
interface MemoryMetadata {
  [key: string]: string | number | boolean | null;
}
```

### SearchResult

```typescript
interface SearchResult {
  memory: Memory;
  score: number;  // 0-1, higher is more similar
}
```

### Relationship

```typescript
interface Relationship {
  source_id: string;
  target_id: string;
  type: string;
  strength: number;  // 0-1
  metadata?: MemoryMetadata;
}
```

### GraphNode

```typescript
interface GraphNode {
  memory: Memory;
  depth: number;
  relationships: Relationship[];
}
```

---

## Error Handling

### RecallBricksError

Custom error class for all API errors.

```typescript
class RecallBricksError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Human-readable error message |
| `statusCode` | `number` | HTTP status code |
| `code` | `string` | Error code from API |
| `details` | `unknown` | Additional error details |

**Error Codes:**

| Code | Description |
|------|-------------|
| `MISSING_AUTH` | Neither apiKey nor serviceToken provided |
| `INVALID_AUTH_CONFIG` | Both apiKey and serviceToken provided |
| `MISSING_USER_ID` | userId required but not provided (service token) |
| `INVALID_INPUT` | Invalid input parameters |
| `NO_RESPONSE` | No response received from server |
| `REQUEST_SETUP_ERROR` | Error setting up the request |

**Retry Behavior:**

- **Retryable errors:** Network errors, 429 (rate limit), 500-504 (server errors)
- **Non-retryable errors:** 400, 401, 403, 404
