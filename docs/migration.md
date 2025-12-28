# Migration Guide: v2.0.0 to v2.1.0

This guide covers upgrading from RecallBricks SDK v2.0.0 to v2.1.0.

## What's New in v2.1.0

### Autonomous Agent Features

v2.1.0 introduces 9 new specialized clients for building autonomous AI agents:

| Client | Purpose |
|--------|---------|
| `workingMemory` | Attention-based active memory with limited capacity |
| `prospectiveMemory` | "Remember to remember" - trigger-based intentions |
| `metacognition` | Self-assessment and performance tracking |
| `memoryTypes` | Human-like memory types (episodic, semantic, procedural) |
| `goals` | Hierarchical objective tracking with milestones |
| `health` | Memory maintenance, staleness detection, refresh |
| `uncertainty` | Uncertainty quantification for memories |
| `context` | Intelligent context building from multiple sources |
| `hybridSearch` | Advanced search combining semantic and keyword matching |

### New API Endpoints

All autonomous features use the `/api/autonomous/*` endpoint namespace:

- `/api/autonomous/working-memory/*`
- `/api/autonomous/prospective-memory/*`
- `/api/autonomous/metacognition/*`
- `/api/autonomous/memory-types/*`
- `/api/autonomous/goals/*`
- `/api/autonomous/health/*`
- `/api/autonomous/uncertainty/*`
- `/api/autonomous/context/*`
- `/api/autonomous/search/*`

---

## Breaking Changes

### None

v2.1.0 is fully backward compatible with v2.0.0. All existing code will continue to work without modifications.

The core API remains unchanged:
- `createMemory()` - unchanged
- `listMemories()` - unchanged
- `search()` - unchanged
- `updateMemory()` - unchanged
- `deleteMemory()` - unchanged
- `getRelationships()` - unchanged
- `getGraphContext()` - unchanged

---

## Upgrade Steps

### 1. Update the Package

```bash
npm install recallbricks@2.1.0
```

Or with yarn:

```bash
yarn upgrade recallbricks@2.1.0
```

### 2. Verify Installation

```typescript
import { RecallBricks } from 'recallbricks';

const client = new RecallBricks({
  apiKey: process.env.RECALLBRICKS_API_KEY,
});

// Existing code continues to work
const memory = await client.createMemory('Test memory');
console.log(`Created: ${memory.id}`);

// New autonomous features are now available
console.log('Working Memory client:', !!client.workingMemory);
console.log('Goals client:', !!client.goals);
console.log('Metacognition client:', !!client.metacognition);
```

### 3. (Optional) Start Using Autonomous Features

The autonomous features are entirely additive. Use them when you need them:

```typescript
// Create a working memory session for your agent
const session = await client.workingMemory.createSession({
  namespace: 'my-agent',
  capacity: 7,
});

// Set a goal for your agent
const goal = await client.goals.create({
  namespace: 'my-project',
  title: 'Complete user onboarding',
  type: 'achievement',
});

// Track performance
const metrics = await client.metacognition.getPerformance('my-agent');
```

---

## TypeScript Changes

### New Exported Types

v2.1.0 exports many new types for autonomous features. These are all additive:

```typescript
import {
  // Working Memory
  WorkingMemorySession,
  WorkingMemoryItem,
  WorkingMemorySessionConfig,

  // Prospective Memory
  Intention,
  TriggerCondition,
  TriggerCheckResult,

  // Metacognition
  AssessmentResult,
  PerformanceMetrics,
  Insight,

  // Memory Types
  EpisodicMemory,
  SemanticMemory,
  ProceduralMemory,

  // Goals
  Goal,
  GoalMilestone,

  // Health
  HealthReport,
  StaleMemory,

  // Uncertainty
  UncertaintyResult,

  // Context
  BuiltContext,

  // Search
  HybridSearchResponse,
} from 'recallbricks';
```

### Type Compatibility

All existing types remain unchanged:

```typescript
import {
  Memory,
  MemoryMetadata,
  SearchResult,
  Relationship,
  GraphNode,
  RecallBricksError,
} from 'recallbricks';
```

---

## API Compatibility

### Backend Requirements

v2.1.0 requires a RecallBricks backend that supports the autonomous endpoints. If your backend doesn't support these features yet:

1. **Core features will work** - All v2.0.0 functionality remains available
2. **Autonomous calls will fail** - Calls to autonomous clients will return 404 errors

Check backend compatibility:

```typescript
try {
  await client.workingMemory.createSession({
    namespace: 'test',
    capacity: 5,
  });
  console.log('Autonomous features supported');
} catch (error) {
  if (error.statusCode === 404) {
    console.log('Backend does not support autonomous features');
  }
}
```

---

## Rollback

If you need to rollback to v2.0.0:

```bash
npm install recallbricks@2.0.0
```

Since v2.1.0 has no breaking changes, rollback is safe. Any code using autonomous features will need to be removed or conditionally disabled.

---

## Support

If you encounter issues during migration:

1. Check [Troubleshooting](./troubleshooting.md)
2. Review [API Reference](./api-reference.md)
3. Open an issue on GitHub

