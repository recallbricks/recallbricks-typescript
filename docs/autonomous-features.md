# Autonomous Agent Features

The RecallBricks SDK v2.1.0 includes 9 specialized clients for building autonomous AI agents with human-like memory systems.

## Overview

| Client | Purpose | Endpoint |
|--------|---------|----------|
| `WorkingMemoryClient` | Attention-based active memory | `/api/autonomous/working-memory` |
| `ProspectiveMemoryClient` | "Remember to remember" | `/api/autonomous/prospective-memory` |
| `MetacognitionClient` | Self-assessment | `/api/autonomous/metacognition` |
| `MemoryTypesClient` | Episodic/Semantic/Procedural | `/api/autonomous/memory-types` |
| `GoalsClient` | Hierarchical objectives | `/api/autonomous/goals` |
| `HealthClient` | Memory maintenance | `/api/autonomous/health` |
| `UncertaintyClient` | Uncertainty quantification | `/api/autonomous/uncertainty` |
| `ContextClient` | Context building | `/api/autonomous/context` |
| `SearchClient` | Hybrid search | `/api/autonomous/search` |

---

## WorkingMemoryClient

Manages limited-capacity, attention-based active memory for agents.

### Methods

#### createSession

```typescript
createSession(config: WorkingMemorySessionConfig): Promise<WorkingMemorySession>
```

Creates a new working memory session.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | `string` | Yes | Unique namespace for the session |
| `capacity` | `number` | No | Max items in working memory |
| `ttlSeconds` | `number` | No | TTL for items |
| `agentId` | `string` | No | Agent ID |
| `metadata` | `Record<string, unknown>` | No | Additional metadata |

```typescript
const session = await client.workingMemory.createSession({
  namespace: 'task-planning',
  capacity: 7,
  ttlSeconds: 3600,
  agentId: 'agent-001'
});
```

#### getSession

```typescript
getSession(sessionId: string): Promise<WorkingMemorySession & { items: WorkingMemoryItem[] }>
```

Gets a session with its current items.

```typescript
const session = await client.workingMemory.getSession('session-123');
console.log(`Items: ${session.currentSize}/${session.capacity}`);
```

#### addMemory

```typescript
addMemory(sessionId: string, memoryId: string, options?: AddMemoryOptions): Promise<WorkingMemoryItem>
```

Adds a memory to working memory.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session ID |
| `memoryId` | `string` | Yes | Memory ID to add |
| `options.priority` | `number` | No | Priority level |
| `options.tags` | `string[]` | No | Tags |
| `options.relevanceScore` | `number` | No | Relevance score |
| `options.metadata` | `Record<string, unknown>` | No | Metadata |

```typescript
const item = await client.workingMemory.addMemory('session-123', 'mem-456', {
  priority: 8,
  relevanceScore: 0.95
});
```

#### promote

```typescript
promote(itemId: string): Promise<PromoteResult>
```

Promotes an item, increasing its priority.

```typescript
const result = await client.workingMemory.promote('item-789');
console.log(`New priority: ${result.newPriority}`);
```

#### autoManage

```typescript
autoManage(sessionId: string): Promise<AutoManageResult>
```

Automatically manages working memory by evicting low-priority items.

```typescript
const result = await client.workingMemory.autoManage('session-123');
console.log(`Evicted: ${result.summary.itemsEvicted}`);
console.log(`Promoted: ${result.summary.itemsPromoted}`);
```

#### deleteSession

```typescript
deleteSession(sessionId: string): Promise<boolean>
```

Deletes a session and all its items.

---

## ProspectiveMemoryClient

Enables "remembering to remember" - setting intentions triggered by future events.

### Methods

#### create

```typescript
create(intention: IntentionConfig): Promise<Intention>
```

Creates a new prospective memory intention.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | `string` | Yes | Namespace |
| `description` | `string` | Yes | What to remember to do |
| `triggers` | `TriggerCondition[]` | Yes | When to trigger |
| `action` | `{ type: string; parameters?: Record<string, unknown> }` | Yes | Action to take |
| `priority` | `number` | No | Priority (1-10) |
| `expiresAt` | `string` | No | Expiration time (ISO 8601) |
| `agentId` | `string` | No | Agent ID |

**Trigger Types:** `time`, `event`, `context`, `keyword`, `semantic`

```typescript
const intention = await client.prospectiveMemory.create({
  namespace: 'reminders',
  description: 'Remind about deadline when user mentions project',
  triggers: [
    { type: 'keyword', value: 'project status' },
    { type: 'time', value: '2025-01-15T09:00:00Z' }
  ],
  action: {
    type: 'inject_context',
    parameters: { memoryIds: ['mem-deadline'] }
  },
  priority: 8
});
```

#### getPending

```typescript
getPending(namespace: string): Promise<Intention[]>
```

Gets all pending intentions for a namespace.

```typescript
const pending = await client.prospectiveMemory.getPending('reminders');
```

#### checkTriggers

```typescript
checkTriggers(context?: Record<string, unknown>): Promise<TriggerCheckResult>
```

Checks triggers against the current context.

```typescript
const result = await client.prospectiveMemory.checkTriggers({
  currentText: 'What is the project status?'
});

if (result.triggered.length > 0) {
  console.log('Triggered:', result.triggered);
}
```

#### complete

```typescript
complete(id: string, result?: Record<string, unknown>): Promise<Intention>
```

Marks an intention as completed.

```typescript
await client.prospectiveMemory.complete('intention-123', {
  outcome: 'success',
  notes: 'User acknowledged'
});
```

---

## MetacognitionClient

Enables agents to assess their own performance and calibrate confidence.

### Methods

#### assess

```typescript
assess(quality: QualityAssessment): Promise<AssessmentResult>
```

Assesses the quality of agent output.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | `string` | Yes | Agent ID |
| `content` | `string` | Yes | Content being assessed |
| `contentType` | `'response' \| 'decision' \| 'retrieval' \| 'reasoning'` | Yes | Type |
| `selfScore` | `number` | No | Self-assessed score (0-1) |
| `confidence` | `number` | No | Confidence in assessment |
| `reasoning` | `string` | No | Reasoning |
| `groundTruth` | `{ score: number; source: string; feedback?: string }` | No | External feedback |

```typescript
const result = await client.metacognition.assess({
  agentId: 'agent-001',
  content: 'The capital of France is Paris',
  contentType: 'response',
  selfScore: 0.95,
  confidence: 0.9
});

console.log(`Quality: ${result.qualityScore}`);
console.log(`Calibration: ${result.calibrationScore}`);
```

#### getPerformance

```typescript
getPerformance(agentId: string, options?: { days?: number; contentType?: string }): Promise<PerformanceMetrics>
```

Gets performance metrics for an agent.

```typescript
const performance = await client.metacognition.getPerformance('agent-001', {
  days: 30
});

console.log(`Overall: ${performance.overallScore}`);
console.log(`Calibration accuracy: ${performance.calibrationAccuracy}`);
```

#### getInsights

```typescript
getInsights(agentId: string, options?: { minImportance?: number; type?: string; limit?: number }): Promise<Insight[]>
```

Gets insights from metacognitive analysis.

**Insight Types:** `pattern`, `anomaly`, `recommendation`, `trend`

```typescript
const insights = await client.metacognition.getInsights('agent-001', {
  minImportance: 7,
  type: 'recommendation'
});
```

---

## MemoryTypesClient

Provides access to three human-like memory types.

### Episodic Memory (Events)

#### createEpisodic

```typescript
createEpisodic(memory: EpisodicMemoryConfig): Promise<EpisodicMemory>
```

Creates an episodic memory (specific event/experience).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | `string` | Yes | Namespace |
| `content` | `string` | Yes | Description of the episode |
| `timestamp` | `string` | No | When it occurred |
| `location` | `string` | No | Location/context |
| `entities` | `string[]` | No | Entities involved |
| `emotionalValence` | `number` | No | Emotional valence (-1 to 1) |
| `importance` | `number` | No | Importance (0-1) |

```typescript
const episode = await client.memoryTypes.createEpisodic({
  namespace: 'conversations',
  content: 'User asked about weather in Paris',
  entities: ['user-123', 'Paris', 'weather'],
  emotionalValence: 0.3,
  importance: 0.7
});
```

#### getEpisodic

```typescript
getEpisodic(filters?: EpisodicMemoryFilters): Promise<EpisodicMemory[]>
```

Retrieves episodic memories matching filters.

```typescript
const episodes = await client.memoryTypes.getEpisodic({
  entities: ['user-123'],
  minImportance: 0.5,
  limit: 10
});
```

### Semantic Memory (Facts)

#### createSemantic

```typescript
createSemantic(memory: SemanticMemoryConfig): Promise<SemanticMemory>
```

Creates a semantic memory (fact/concept).

```typescript
const fact = await client.memoryTypes.createSemantic({
  namespace: 'knowledge',
  content: 'TypeScript is a superset of JavaScript',
  category: 'programming-languages',
  confidence: 1.0,
  relatedConcepts: ['JavaScript', 'type-safety']
});
```

#### getSemantic

```typescript
getSemantic(filters?: SemanticMemoryFilters): Promise<SemanticMemory[]>
```

### Procedural Memory (How-To)

#### createProcedural

```typescript
createProcedural(memory: ProceduralMemoryConfig): Promise<ProceduralMemory>
```

Creates a procedural memory (skill/procedure).

```typescript
const procedure = await client.memoryTypes.createProcedural({
  namespace: 'workflows',
  name: 'Handle Error Response',
  description: 'Steps to handle API errors',
  steps: [
    { order: 1, description: 'Log the error' },
    { order: 2, description: 'Determine retry eligibility' },
    { order: 3, description: 'Execute retry or fallback' }
  ],
  triggers: ['API error', 'network failure']
});
```

#### getProcedural

```typescript
getProcedural(filters?: ProceduralMemoryFilters): Promise<ProceduralMemory[]>
```

---

## GoalsClient

Manages hierarchical objectives with milestones.

### Methods

#### create

```typescript
create(goal: GoalConfig): Promise<Goal>
```

Creates a new goal.

**Goal Types:** `achievement`, `maintenance`, `learning`, `optimization`

```typescript
const goal = await client.goals.create({
  namespace: 'project-alpha',
  title: 'Implement User Authentication',
  description: 'Add secure auth with OAuth',
  type: 'achievement',
  priority: 9,
  milestones: [
    { description: 'Design auth flow' },
    { description: 'Implement OAuth' },
    { description: 'Add session management' }
  ],
  successCriteria: ['All tests pass', 'Security review complete']
});
```

#### getActive

```typescript
getActive(namespace: string, options?: { type?: string; minPriority?: number; agentId?: string }): Promise<Goal[]>
```

Gets active goals for a namespace.

```typescript
const goals = await client.goals.getActive('project-alpha', {
  type: 'achievement',
  minPriority: 5
});
```

#### get

```typescript
get(goalId: string): Promise<Goal>
```

Gets a specific goal by ID.

#### advance

```typescript
advance(goalId: string, result: { action: string; milestoneId?: string; progressDelta?: number; evidence?: Record<string, unknown> }): Promise<AdvanceResult>
```

Advances progress on a goal.

```typescript
const result = await client.goals.advance('goal-123', {
  action: 'Completed OAuth integration',
  milestoneId: 'milestone-2',
  progressDelta: 25
});

if (result.goalCompleted) {
  console.log('Goal achieved!');
}
```

#### complete

```typescript
complete(goalId: string, summary?: { outcome: 'success' | 'partial' | 'abandoned'; summary?: string; lessonsLearned?: string[] }): Promise<Goal>
```

Marks a goal as completed.

---

## HealthClient

Maintains memory quality by identifying stale content.

### Methods

#### getStale

```typescript
getStale(namespace: string, threshold: number, options?: { minImportance?: number; memoryType?: string; limit?: number }): Promise<StaleMemory[]>
```

Gets stale memories that haven't been accessed recently.

**Recommendations:** `refresh`, `archive`, `delete`, `keep`

```typescript
const stale = await client.health.getStale('knowledge-base', 30, {
  minImportance: 0.5,
  limit: 100
});

const toRefresh = stale.filter(m => m.recommendation === 'refresh');
```

#### refresh

```typescript
refresh(memoryId: string, verifiedBy: string, updates?: { content?: string; metadata?: Record<string, unknown>; tags?: string[] }): Promise<RefreshResult>
```

Refreshes a memory, updating its verification status.

```typescript
const result = await client.health.refresh('mem-123', 'agent-verification', {
  tags: ['verified', 'updated']
});
```

#### getReport

```typescript
getReport(namespace: string, options?: { includeStaleMemories?: boolean; staleThreshold?: number; compareWithDays?: number }): Promise<HealthReport>
```

Gets a comprehensive health report.

```typescript
const report = await client.health.getReport('production', {
  includeStaleMemories: true,
  staleThreshold: 14
});

console.log(`Health Score: ${report.metrics.healthScore}/100`);
console.log(`Trend: ${report.trend.direction}`);
```

---

## UncertaintyClient

Quantifies and tracks uncertainty in agent outputs.

### Methods

#### quantify

```typescript
quantify(analysis: UncertaintyAnalysis): Promise<UncertaintyResult>
```

Quantifies uncertainty for agent output.

```typescript
const result = await client.uncertainty.quantify({
  agentId: 'agent-001',
  content: 'Sales will increase 15% next quarter',
  contentType: 'prediction',
  selfConfidence: 0.75,
  knownUnknowns: ['Market conditions', 'Competitor actions'],
  assumptions: ['Economic stability'],
  evidence: [
    { source: 'historical-data', strength: 0.8, description: '3 years of data' }
  ]
});

console.log(`Uncertainty: ${result.uncertaintyScore}`);
console.log(`Reliability: ${result.reliability}`);
console.log(`Epistemic: ${result.epistemicUncertainty}`);
console.log(`Aleatoric: ${result.aleatoricUncertainty}`);

if (result.deferAction) {
  console.log('Gather more information first');
}
```

#### getHistory

```typescript
getHistory(agentId: string, options?: { days?: number; contentType?: string; limit?: number }): Promise<UncertaintyHistory>
```

Gets uncertainty history for an agent.

```typescript
const history = await client.uncertainty.getHistory('agent-001', {
  days: 30
});

console.log(`Calibration: ${history.calibrationScore}`);
console.log(`Trend: ${history.trend.direction}`);
```

---

## ContextClient

Intelligently assembles context from multiple memory sources.

### Methods

#### build

```typescript
build(config: ContextBuildConfig): Promise<BuiltContext>
```

Builds context from multiple sources.

**Source Types:** `working_memory`, `episodic`, `semantic`, `procedural`, `search`

```typescript
const context = await client.context.build({
  namespace: 'customer-support',
  query: 'Help user with billing issue',
  maxTokens: 8000,
  sources: [
    { type: 'working_memory', config: { sessionId: 'current' }, weight: 2.0 },
    { type: 'semantic', config: { category: 'billing' }, weight: 1.5 },
    { type: 'episodic', config: { entities: ['user-123'] }, maxItems: 5 },
    { type: 'procedural', config: { trigger: 'billing' } }
  ],
  recencyBias: 0.7,
  relevanceThreshold: 0.5,
  includeProspective: true,
  includeGoals: true
});

console.log(`Quality: ${context.qualityScore}`);
console.log(`Tokens: ${context.totalTokens}`);
console.log(context.formattedContext);
```

---

## SearchClient (hybridSearch)

Advanced hybrid search combining multiple ranking signals.

### Methods

#### hybrid

```typescript
hybrid(query: string, options?: HybridSearchOptions): Promise<HybridSearchResponse>
```

Performs hybrid search with customizable weights.

```typescript
const results = await client.hybridSearch.hybrid('payment processing error', {
  namespace: 'support-tickets',
  memoryTypes: ['episodic', 'semantic'],
  semanticWeight: 0.5,
  keywordWeight: 0.2,
  graphWeight: 0.15,
  recencyWeight: 0.15,
  includeRelationships: true,
  expandQuery: true,
  rerank: true,
  timeRange: {
    from: '2025-01-01T00:00:00Z',
    to: '2025-01-31T23:59:59Z'
  }
});

console.log(`Found ${results.totalFound} results in ${results.searchDurationMs}ms`);

results.results.forEach(r => {
  console.log(`[${r.score.toFixed(3)}] ${r.content}`);
  console.log(`  Semantic: ${r.componentScores.semantic.toFixed(2)}`);
  console.log(`  Keyword: ${r.componentScores.keyword.toFixed(2)}`);
});
```
