import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Context Types
// ============================================================================

/**
 * A memory source for context building
 */
export interface ContextSource {
  /** Source type */
  type: 'working_memory' | 'episodic' | 'semantic' | 'procedural' | 'search';
  /** Configuration for this source */
  config: Record<string, unknown>;
  /** Weight for this source in final context */
  weight?: number;
  /** Maximum items from this source */
  maxItems?: number;
}

/**
 * Configuration for building context
 */
export interface ContextBuildConfig {
  /** Namespace */
  namespace: string;
  /** Agent ID */
  agentId?: string;
  /** Current task or query */
  query?: string;
  /** Sources to include */
  sources?: ContextSource[];
  /** Maximum total tokens in context */
  maxTokens?: number;
  /** Recency bias (0-1, higher = prefer recent) */
  recencyBias?: number;
  /** Relevance threshold (0-1) */
  relevanceThreshold?: number;
  /** Include prospective memory triggers */
  includeProspective?: boolean;
  /** Include goals context */
  includeGoals?: boolean;
  /** Session ID for working memory */
  sessionId?: string;
  /** Additional context to inject */
  additionalContext?: Record<string, unknown>;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A memory item included in context
 */
export interface ContextItem {
  /** Source this item came from */
  source: string;
  /** Item ID */
  id: string;
  /** Content */
  content: string;
  /** Relevance score */
  relevanceScore: number;
  /** Recency score */
  recencyScore: number;
  /** Combined score */
  combinedScore: number;
  /** Memory type */
  memoryType?: string;
  /** Token count */
  tokenCount: number;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Active goal included in context
 */
export interface ContextGoal {
  /** Goal ID */
  id: string;
  /** Goal title */
  title: string;
  /** Current progress */
  progress: number;
  /** Priority */
  priority: number;
  /** Relevance to current query */
  relevance: number;
}

/**
 * Triggered intention from prospective memory
 */
export interface ContextIntention {
  /** Intention ID */
  id: string;
  /** Description */
  description: string;
  /** Trigger that matched */
  matchedTrigger: string;
  /** Priority */
  priority: number;
  /** Suggested action */
  suggestedAction: string;
}

/**
 * Built context result
 */
export interface BuiltContext {
  /** Context ID */
  id: string;
  /** Namespace */
  namespace: string;
  /** The query used to build context */
  query?: string;
  /** Memory items included */
  items: ContextItem[];
  /** Active goals relevant to context */
  activeGoals: ContextGoal[];
  /** Triggered prospective intentions */
  triggeredIntentions: ContextIntention[];
  /** Total token count */
  totalTokens: number;
  /** Token budget remaining */
  tokensRemaining: number;
  /** Formatted context string */
  formattedContext: string;
  /** Context quality score */
  qualityScore: number;
  /** Build timestamp */
  builtAt: string;
  /** Build duration in ms */
  buildDurationMs: number;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Client for context building operations
 *
 * The context client intelligently assembles relevant information from
 * multiple memory sources to provide optimal context for agent tasks.
 * It handles token budgeting, relevance scoring, and source prioritization.
 *
 * @example
 * ```typescript
 * const context = new ContextClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'http://localhost:10002'
 * });
 *
 * // Build context for a query
 * const result = await context.build({
 *   namespace: 'assistant',
 *   query: 'What does the user prefer for notifications?',
 *   maxTokens: 4000,
 *   sources: [
 *     { type: 'working_memory', config: { sessionId: 'session-123' } },
 *     { type: 'semantic', config: { category: 'preferences' }, weight: 1.5 }
 *   ],
 *   includeGoals: true
 * });
 *
 * console.log(result.formattedContext);
 * ```
 */
export class ContextClient {
  private readonly client: AxiosInstance;

  /**
   * Creates a new ContextClient instance
   *
   * @param config - Client configuration
   */
  constructor(config: { apiKey: string; baseUrl: string }) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/autonomous/context`,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Builds context from multiple memory sources
   *
   * @param config - Context build configuration
   * @returns The built context with all relevant information
   *
   * @example
   * ```typescript
   * const context = await contextClient.build({
   *   namespace: 'customer-support',
   *   agentId: 'agent-001',
   *   query: 'Help the user with their billing issue',
   *   maxTokens: 8000,
   *   sources: [
   *     {
   *       type: 'working_memory',
   *       config: { sessionId: 'session-current' },
   *       weight: 2.0,
   *       maxItems: 10
   *     },
   *     {
   *       type: 'semantic',
   *       config: { category: 'billing-policies' },
   *       weight: 1.5
   *     },
   *     {
   *       type: 'episodic',
   *       config: { entities: ['user-123'] },
   *       maxItems: 5
   *     },
   *     {
   *       type: 'procedural',
   *       config: { trigger: 'billing issue' }
   *     }
   *   ],
   *   recencyBias: 0.7,
   *   relevanceThreshold: 0.5,
   *   includeProspective: true,
   *   includeGoals: true
   * });
   *
   * // Use the formatted context
   * console.log(`Quality: ${context.qualityScore}`);
   * console.log(`Tokens used: ${context.totalTokens}/${context.totalTokens + context.tokensRemaining}`);
   *
   * // Check for triggered intentions
   * if (context.triggeredIntentions.length > 0) {
   *   console.log('Triggered intentions:');
   *   context.triggeredIntentions.forEach(i => {
   *     console.log(`  - ${i.description}: ${i.suggestedAction}`);
   *   });
   * }
   *
   * // Check active goals
   * if (context.activeGoals.length > 0) {
   *   console.log('Relevant goals:');
   *   context.activeGoals.forEach(g => {
   *     console.log(`  - ${g.title} (${g.progress}%)`);
   *   });
   * }
   * ```
   */
  async build(config: ContextBuildConfig): Promise<BuiltContext> {
    const response = await this.client.post<BuiltContext>('/build', {
      namespace: config.namespace,
      agent_id: config.agentId,
      query: config.query,
      sources: config.sources?.map(s => ({
        type: s.type,
        config: s.config,
        weight: s.weight,
        max_items: s.maxItems,
      })),
      max_tokens: config.maxTokens,
      recency_bias: config.recencyBias,
      relevance_threshold: config.relevanceThreshold,
      include_prospective: config.includeProspective,
      include_goals: config.includeGoals,
      session_id: config.sessionId,
      additional_context: config.additionalContext,
      metadata: config.metadata,
    });
    return response.data;
  }
}
