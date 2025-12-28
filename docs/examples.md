# RecallBricks SDK Examples

Working, copy-paste runnable examples for the RecallBricks TypeScript SDK.

## Setup

All examples assume the following setup:

```typescript
import { RecallBricks, RecallBricksError } from 'recallbricks';

const client = new RecallBricks({
  apiKey: process.env.RECALLBRICKS_API_KEY || 'your-api-key',
  baseUrl: process.env.RECALLBRICKS_BASE_URL || 'http://localhost:10002/api/v1',
});
```

---

## Basic Memory Operations

### Save and Retrieve Memories

```typescript
import { RecallBricks } from 'recallbricks';

async function basicMemoryExample() {
  const client = new RecallBricks({
    apiKey: process.env.RECALLBRICKS_API_KEY!,
  });

  // Create a memory
  const memory = await client.createMemory(
    'User prefers dark mode and compact view',
    {
      tags: ['preference', 'ui', 'settings'],
      metadata: {
        userId: 'user-123',
        source: 'settings-page',
        confidence: 1.0,
      },
    }
  );

  console.log('Created memory:', memory.id);

  // Search for memories
  const searchResults = await client.search('user interface preferences', {
    limit: 5,
    threshold: 0.6,
  });

  console.log(`Found ${searchResults.results.length} matches`);
  searchResults.results.forEach((result) => {
    console.log(`  [${result.score.toFixed(2)}] ${result.memory.text}`);
  });

  // Update the memory
  const updated = await client.updateMemory(memory.id, {
    text: 'User strongly prefers dark mode and compact view',
    tags: ['preference', 'ui', 'settings', 'verified'],
  });

  console.log('Updated at:', updated.updated_at);

  // List all memories
  const list = await client.listMemories({
    limit: 10,
    tags: ['preference'],
    sort: 'desc',
  });

  console.log(`Total preference memories: ${list.total}`);

  // Delete the memory
  await client.deleteMemory(memory.id);
  console.log('Memory deleted');
}

basicMemoryExample().catch(console.error);
```

---

## Working Memory Session

```typescript
import { RecallBricks } from 'recallbricks';

async function workingMemoryExample() {
  const client = new RecallBricks({
    apiKey: process.env.RECALLBRICKS_API_KEY!,
  });

  // Create a working memory session
  const session = await client.workingMemory.createSession({
    namespace: 'customer-support-agent',
    capacity: 7, // Miller's magic number
    ttlSeconds: 3600,
    agentId: 'support-agent-001',
  });

  console.log(`Created session: ${session.id}`);
  console.log(`Capacity: ${session.capacity}`);

  // First, create some memories to add to working memory
  const mem1 = await client.createMemory('Customer has premium subscription', {
    tags: ['customer-context'],
  });

  const mem2 = await client.createMemory('Customer reported billing issue yesterday', {
    tags: ['customer-context'],
  });

  const mem3 = await client.createMemory('Billing issues should be escalated to tier 2', {
    tags: ['procedure'],
  });

  // Add memories to working memory with priorities
  await client.workingMemory.addMemory(session.id, mem1.id, {
    priority: 8,
    relevanceScore: 0.95,
    tags: ['current-customer'],
  });

  await client.workingMemory.addMemory(session.id, mem2.id, {
    priority: 9,
    relevanceScore: 0.98,
    tags: ['current-issue'],
  });

  await client.workingMemory.addMemory(session.id, mem3.id, {
    priority: 7,
    relevanceScore: 0.85,
    tags: ['procedure'],
  });

  // Get session with items
  const sessionWithItems = await client.workingMemory.getSession(session.id);
  console.log(`\nWorking memory items: ${sessionWithItems.items.length}`);

  sessionWithItems.items.forEach((item) => {
    console.log(`  [Priority ${item.priority}] Memory ${item.memoryId}`);
  });

  // Promote an important item
  const firstItem = sessionWithItems.items[0];
  const promoteResult = await client.workingMemory.promote(firstItem.id);
  console.log(`\nPromoted item. New priority: ${promoteResult.newPriority}`);

  // Auto-manage: evict low-priority, promote high-relevance
  const manageResult = await client.workingMemory.autoManage(session.id);
  console.log('\nAuto-manage results:');
  console.log(`  Kept: ${manageResult.summary.itemsKept}`);
  console.log(`  Evicted: ${manageResult.summary.itemsEvicted}`);
  console.log(`  Promoted: ${manageResult.summary.itemsPromoted}`);

  // Clean up
  await client.workingMemory.deleteSession(session.id);
  await client.deleteMemory(mem1.id);
  await client.deleteMemory(mem2.id);
  await client.deleteMemory(mem3.id);

  console.log('\nSession deleted');
}

workingMemoryExample().catch(console.error);
```

---

## Goal Tracking

```typescript
import { RecallBricks } from 'recallbricks';

async function goalTrackingExample() {
  const client = new RecallBricks({
    apiKey: process.env.RECALLBRICKS_API_KEY!,
  });

  // Create a goal with milestones
  const goal = await client.goals.create({
    namespace: 'feature-development',
    title: 'Implement User Dashboard',
    description: 'Create a comprehensive user dashboard with analytics',
    type: 'achievement',
    priority: 8,
    milestones: [
      { description: 'Design dashboard wireframes' },
      { description: 'Implement data fetching layer' },
      { description: 'Build chart components' },
      { description: 'Add user preferences' },
      { description: 'Write integration tests' },
    ],
    successCriteria: [
      'All tests passing',
      'Performance under 2s load time',
      'Accessibility audit passed',
    ],
    deadline: '2025-02-28T23:59:59Z',
  });

  console.log(`Created goal: ${goal.title}`);
  console.log(`ID: ${goal.id}`);
  console.log(`Progress: ${goal.progress}%`);
  console.log(`Milestones: ${goal.milestones.length}`);

  // Get active goals
  const activeGoals = await client.goals.getActive('feature-development', {
    minPriority: 5,
  });

  console.log(`\nActive goals: ${activeGoals.length}`);

  // Advance progress on the goal
  const advance1 = await client.goals.advance(goal.id, {
    action: 'Completed dashboard wireframes in Figma',
    milestoneId: goal.milestones[0].id,
    progressDelta: 20,
    evidence: {
      figmaLink: 'https://figma.com/...',
      reviewedBy: 'design-team',
    },
  });

  console.log(`\nAfter wireframes:`);
  console.log(`  Progress: ${advance1.newProgress}%`);
  console.log(`  Milestones completed: ${advance1.milestonesCompleted.length}`);

  // Continue advancing
  const advance2 = await client.goals.advance(goal.id, {
    action: 'Implemented GraphQL data layer',
    milestoneId: goal.milestones[1].id,
    progressDelta: 20,
  });

  console.log(`\nAfter data layer:`);
  console.log(`  Progress: ${advance2.newProgress}%`);

  // Check if goal is complete
  if (advance2.goalCompleted) {
    console.log('Goal completed!');
  } else {
    console.log(`  Suggested next: ${advance2.suggestedNextActions?.join(', ')}`);
  }

  // Get full goal details
  const fullGoal = await client.goals.get(goal.id);
  console.log(`\nFull goal status:`);
  console.log(`  Status: ${fullGoal.status}`);
  console.log(`  Completed milestones: ${fullGoal.milestones.filter((m) => m.completed).length}/${fullGoal.milestones.length}`);

  // Complete the goal (in real scenario, after all work is done)
  const completed = await client.goals.complete(goal.id, {
    outcome: 'success',
    summary: 'Dashboard implemented with all features',
    lessonsLearned: [
      'GraphQL simplifies data fetching',
      'Chart library needed customization',
    ],
  });

  console.log(`\nGoal completed: ${completed.completedAt}`);
}

goalTrackingExample().catch(console.error);
```

---

## Metacognition Assessment

```typescript
import { RecallBricks } from 'recallbricks';

async function metacognitionExample() {
  const client = new RecallBricks({
    apiKey: process.env.RECALLBRICKS_API_KEY!,
  });

  const agentId = 'analysis-agent-001';

  // Assess a response
  const assessment = await client.metacognition.assess({
    agentId,
    content: 'Based on the Q3 data, revenue increased by 15% compared to Q2',
    contentType: 'response',
    selfScore: 0.85,
    confidence: 0.8,
    reasoning: 'Data directly from financial reports, straightforward calculation',
    groundTruth: {
      score: 0.9,
      source: 'finance-team-review',
      feedback: 'Correct analysis, minor rounding difference',
    },
  });

  console.log('Assessment Results:');
  console.log(`  Quality Score: ${assessment.qualityScore}`);
  console.log(`  Confidence: ${assessment.confidence}`);
  console.log(`  Calibration: ${assessment.calibrationScore}`);
  console.log(`  Strengths: ${assessment.strengths.join(', ')}`);
  console.log(`  Improvements: ${assessment.improvements.join(', ')}`);

  // Assess a decision
  await client.metacognition.assess({
    agentId,
    content: 'Recommended escalating to tier 2 support based on issue complexity',
    contentType: 'decision',
    selfScore: 0.75,
    confidence: 0.7,
    reasoning: 'Issue involves billing and technical components',
  });

  // Get performance metrics
  const performance = await client.metacognition.getPerformance(agentId, {
    days: 30,
  });

  console.log('\nPerformance Metrics (30 days):');
  console.log(`  Overall Score: ${performance.overallScore}`);
  console.log(`  Average Quality: ${performance.averageQuality}`);
  console.log(`  Calibration Accuracy: ${performance.calibrationAccuracy}`);
  console.log(`  Confidence Correlation: ${performance.confidenceCorrelation}`);
  console.log(`  Total Assessments: ${performance.totalAssessments}`);

  // Get insights
  const insights = await client.metacognition.getInsights(agentId, {
    minImportance: 5,
    limit: 5,
  });

  console.log('\nInsights:');
  insights.forEach((insight) => {
    console.log(`  [${insight.type}] ${insight.title}`);
    console.log(`    ${insight.description}`);
    if (insight.actions) {
      insight.actions.forEach((action) => {
        console.log(`    - ${action}`);
      });
    }
  });
}

metacognitionExample().catch(console.error);
```

---

## Memory Types (Episodic, Semantic, Procedural)

```typescript
import { RecallBricks } from 'recallbricks';

async function memoryTypesExample() {
  const client = new RecallBricks({
    apiKey: process.env.RECALLBRICKS_API_KEY!,
  });

  // Create an episodic memory (specific event)
  const episode = await client.memoryTypes.createEpisodic({
    namespace: 'user-interactions',
    content: 'User John successfully completed the onboarding tutorial',
    entities: ['user-john', 'onboarding', 'tutorial'],
    location: 'web-app',
    emotionalValence: 0.8, // Positive experience
    importance: 0.9,
    timestamp: new Date().toISOString(),
    tags: ['onboarding', 'success'],
  });

  console.log('Episodic memory created:', episode.id);

  // Create a semantic memory (fact/knowledge)
  const fact = await client.memoryTypes.createSemantic({
    namespace: 'domain-knowledge',
    content: 'Premium users have access to advanced analytics features',
    category: 'product-features',
    confidence: 1.0,
    source: 'product-documentation',
    relatedConcepts: ['premium', 'analytics', 'features'],
    tags: ['product', 'premium'],
  });

  console.log('Semantic memory created:', fact.id);

  // Create a procedural memory (how-to)
  const procedure = await client.memoryTypes.createProcedural({
    namespace: 'support-procedures',
    name: 'Handle Billing Dispute',
    description: 'Standard procedure for handling customer billing disputes',
    steps: [
      {
        order: 1,
        description: 'Verify customer identity',
        conditions: ['Customer authenticated'],
      },
      {
        order: 2,
        description: 'Review transaction history',
        input: { transactionId: 'string' },
      },
      {
        order: 3,
        description: 'Document the dispute reason',
      },
      {
        order: 4,
        description: 'Escalate to billing team if amount > $100',
        conditions: ['amount > 100'],
      },
      {
        order: 5,
        description: 'Process refund or resolution',
        output: { resolutionId: 'string', status: 'string' },
      },
    ],
    triggers: ['billing dispute', 'refund request', 'charge complaint'],
    successRate: 0.95,
    tags: ['billing', 'support'],
  });

  console.log('Procedural memory created:', procedure.id);

  // Query episodic memories
  const recentEpisodes = await client.memoryTypes.getEpisodic({
    entities: ['user-john'],
    minImportance: 0.5,
    limit: 10,
  });

  console.log(`\nEpisodes involving user-john: ${recentEpisodes.length}`);

  // Query semantic memories
  const productFacts = await client.memoryTypes.getSemantic({
    category: 'product-features',
    minConfidence: 0.8,
    query: 'premium features',
  });

  console.log(`Product feature facts: ${productFacts.length}`);

  // Query procedural memories
  const billingProcedures = await client.memoryTypes.getProcedural({
    trigger: 'billing',
    minSuccessRate: 0.9,
  });

  console.log(`Billing procedures: ${billingProcedures.length}`);
}

memoryTypesExample().catch(console.error);
```

---

## Hybrid Search

```typescript
import { RecallBricks } from 'recallbricks';

async function hybridSearchExample() {
  const client = new RecallBricks({
    apiKey: process.env.RECALLBRICKS_API_KEY!,
  });

  // Basic hybrid search
  const basicResults = await client.hybridSearch.hybrid(
    'payment processing errors',
    {
      limit: 5,
      threshold: 0.5,
    }
  );

  console.log('Basic Search Results:');
  console.log(`Found ${basicResults.totalFound} total results`);
  console.log(`Search took ${basicResults.searchDurationMs}ms`);

  // Advanced hybrid search with custom weights
  const advancedResults = await client.hybridSearch.hybrid(
    'customer complaint about slow checkout',
    {
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
        to: '2025-12-31T23:59:59Z',
      },
      limit: 10,
    }
  );

  console.log('\nAdvanced Search Results:');
  console.log(`Found ${advancedResults.totalFound} results`);

  if (advancedResults.expandedQuery) {
    console.log(`Query expanded to: ${advancedResults.expandedQuery}`);
  }

  if (advancedResults.queryAnalysis) {
    console.log(`Intent: ${advancedResults.queryAnalysis.intent}`);
    console.log(`Entities: ${advancedResults.queryAnalysis.entities.join(', ')}`);
  }

  advancedResults.results.forEach((result, index) => {
    console.log(`\n${index + 1}. [${result.score.toFixed(3)}] ${result.content.substring(0, 100)}...`);
    console.log(`   Type: ${result.memoryType}`);
    console.log(`   Scores: Semantic=${result.componentScores.semantic.toFixed(2)}, Keyword=${result.componentScores.keyword.toFixed(2)}, Graph=${result.componentScores.graph.toFixed(2)}, Recency=${result.componentScores.recency.toFixed(2)}`);

    if (result.relationships && result.relationships.length > 0) {
      console.log(`   Related: ${result.relationships.length} memories`);
    }

    if (result.explanation) {
      console.log(`   Why: ${result.explanation}`);
    }
  });
}

hybridSearchExample().catch(console.error);
```

---

## Context Building

```typescript
import { RecallBricks } from 'recallbricks';

async function contextBuildingExample() {
  const client = new RecallBricks({
    apiKey: process.env.RECALLBRICKS_API_KEY!,
  });

  // Build context for a support query
  const context = await client.context.build({
    namespace: 'customer-support',
    agentId: 'support-agent-001',
    query: 'Help the customer resolve their payment issue',
    maxTokens: 8000,
    sources: [
      {
        type: 'working_memory',
        config: { sessionId: 'current-session' },
        weight: 2.0,
        maxItems: 10,
      },
      {
        type: 'semantic',
        config: { category: 'billing-policies' },
        weight: 1.5,
      },
      {
        type: 'episodic',
        config: { entities: ['current-customer'] },
        maxItems: 5,
      },
      {
        type: 'procedural',
        config: { trigger: 'payment issue' },
      },
    ],
    recencyBias: 0.7,
    relevanceThreshold: 0.5,
    includeProspective: true,
    includeGoals: true,
  });

  console.log('Built Context:');
  console.log(`  ID: ${context.id}`);
  console.log(`  Quality Score: ${context.qualityScore}`);
  console.log(`  Tokens Used: ${context.totalTokens}`);
  console.log(`  Tokens Remaining: ${context.tokensRemaining}`);
  console.log(`  Build Time: ${context.buildDurationMs}ms`);

  console.log(`\nContext Items: ${context.items.length}`);
  context.items.forEach((item) => {
    console.log(`  [${item.source}] Score: ${item.combinedScore.toFixed(2)} - ${item.content.substring(0, 50)}...`);
  });

  if (context.activeGoals.length > 0) {
    console.log('\nRelevant Goals:');
    context.activeGoals.forEach((goal) => {
      console.log(`  - ${goal.title} (${goal.progress}% complete, priority ${goal.priority})`);
    });
  }

  if (context.triggeredIntentions.length > 0) {
    console.log('\nTriggered Intentions:');
    context.triggeredIntentions.forEach((intention) => {
      console.log(`  - ${intention.description}`);
      console.log(`    Action: ${intention.suggestedAction}`);
    });
  }

  console.log('\nFormatted Context:');
  console.log(context.formattedContext.substring(0, 500) + '...');
}

contextBuildingExample().catch(console.error);
```

---

## Error Handling

```typescript
import { RecallBricks, RecallBricksError } from 'recallbricks';

async function errorHandlingExample() {
  const client = new RecallBricks({
    apiKey: 'invalid-api-key', // Will cause auth error
  });

  try {
    await client.createMemory('test');
  } catch (error) {
    if (error instanceof RecallBricksError) {
      console.log('RecallBricks Error:');
      console.log(`  Message: ${error.message}`);
      console.log(`  Status Code: ${error.statusCode}`);
      console.log(`  Error Code: ${error.code}`);

      // Handle specific errors
      switch (error.code) {
        case 'MISSING_AUTH':
          console.log('  -> No API key or service token provided');
          break;
        case 'INVALID_INPUT':
          console.log('  -> Check your input parameters');
          break;
        case 'NO_RESPONSE':
          console.log('  -> Server unreachable, check your network');
          break;
        default:
          console.log('  -> Unexpected error');
      }

      if (error.details) {
        console.log(`  Details: ${JSON.stringify(error.details)}`);
      }
    } else {
      console.log('Unexpected error:', error);
    }
  }

  // Empty text validation
  try {
    await client.createMemory('');
  } catch (error) {
    if (error instanceof RecallBricksError) {
      console.log(`\nValidation error: ${error.message}`);
      console.log(`  Code: ${error.code}`); // INVALID_INPUT
    }
  }
}

errorHandlingExample().catch(console.error);
```
