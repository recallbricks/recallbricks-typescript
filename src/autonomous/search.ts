import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Search Types
// ============================================================================

/**
 * Options for hybrid search
 */
export interface HybridSearchOptions {
  /** Namespace to search */
  namespace?: string;
  /** Agent ID */
  agentId?: string;
  /** Maximum results */
  limit?: number;
  /** Minimum relevance threshold */
  threshold?: number;
  /** Memory types to include */
  memoryTypes?: ('episodic' | 'semantic' | 'procedural' | 'general')[];
  /** Weight for semantic similarity (0-1) */
  semanticWeight?: number;
  /** Weight for keyword matching (0-1) */
  keywordWeight?: number;
  /** Weight for graph relationships (0-1) */
  graphWeight?: number;
  /** Weight for recency (0-1) */
  recencyWeight?: number;
  /** Filter by tags */
  tags?: string[];
  /** Filter by metadata */
  metadata?: Record<string, unknown>;
  /** Time range filter */
  timeRange?: {
    from?: string;
    to?: string;
  };
  /** Include relationship context */
  includeRelationships?: boolean;
  /** Expand search using related concepts */
  expandQuery?: boolean;
  /** Rerank results using cross-encoder */
  rerank?: boolean;
}

/**
 * A hybrid search result
 */
export interface HybridSearchResult {
  /** Memory ID */
  id: string;
  /** Content */
  content: string;
  /** Memory type */
  memoryType: string;
  /** Combined relevance score */
  score: number;
  /** Component scores */
  componentScores: {
    semantic: number;
    keyword: number;
    graph: number;
    recency: number;
  };
  /** Creation timestamp */
  createdAt: string;
  /** Last accessed */
  lastAccessedAt?: string;
  /** Tags */
  tags?: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
  /** Related memories (if includeRelationships) */
  relationships?: {
    id: string;
    type: string;
    strength: number;
  }[];
  /** Explanation of why this result was returned */
  explanation?: string;
}

/**
 * Hybrid search response
 */
export interface HybridSearchResponse {
  /** Search results */
  results: HybridSearchResult[];
  /** Original query */
  query: string;
  /** Expanded query (if expandQuery was true) */
  expandedQuery?: string;
  /** Total results found */
  totalFound: number;
  /** Search duration in ms */
  searchDurationMs: number;
  /** Whether results were reranked */
  reranked: boolean;
  /** Query analysis */
  queryAnalysis?: {
    intent: string;
    entities: string[];
    suggestedFilters?: Record<string, unknown>;
  };
}

/**
 * Client for advanced search operations
 *
 * The search client provides hybrid search capabilities that combine
 * multiple ranking signals (semantic similarity, keyword matching,
 * graph relationships, and recency) for optimal retrieval.
 *
 * @example
 * ```typescript
 * const search = new SearchClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'http://localhost:10002'
 * });
 *
 * // Perform a hybrid search
 * const results = await search.hybrid('user authentication issues', {
 *   namespace: 'support-tickets',
 *   limit: 10,
 *   memoryTypes: ['episodic', 'semantic'],
 *   semanticWeight: 0.6,
 *   recencyWeight: 0.3,
 *   includeRelationships: true
 * });
 *
 * results.results.forEach(r => {
 *   console.log(`[${r.score.toFixed(2)}] ${r.content}`);
 * });
 * ```
 */
export class SearchClient {
  private readonly client: AxiosInstance;

  /**
   * Creates a new SearchClient instance
   *
   * @param config - Client configuration
   */
  constructor(config: { apiKey: string; baseUrl: string }) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/autonomous/search`,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Performs a hybrid search combining multiple ranking signals
   *
   * @param query - The search query
   * @param options - Search options
   * @returns Hybrid search results with component scores
   *
   * @example
   * ```typescript
   * // Basic hybrid search
   * const results = await search.hybrid('how to handle payment failures', {
   *   limit: 5,
   *   threshold: 0.5
   * });
   *
   * // Advanced hybrid search with custom weights
   * const advancedResults = await search.hybrid('customer complained about slow response', {
   *   namespace: 'customer-interactions',
   *   memoryTypes: ['episodic', 'semantic'],
   *   semanticWeight: 0.5,
   *   keywordWeight: 0.2,
   *   graphWeight: 0.15,
   *   recencyWeight: 0.15,
   *   includeRelationships: true,
   *   expandQuery: true,
   *   rerank: true,
   *   timeRange: {
   *     from: '2025-01-01T00:00:00Z',
   *     to: '2025-01-31T23:59:59Z'
   *   }
   * });
   *
   * console.log(`Found ${advancedResults.totalFound} total results`);
   * console.log(`Search took ${advancedResults.searchDurationMs}ms`);
   *
   * if (advancedResults.expandedQuery) {
   *   console.log(`Query expanded to: ${advancedResults.expandedQuery}`);
   * }
   *
   * advancedResults.results.forEach(r => {
   *   console.log(`\n[${r.score.toFixed(3)}] ${r.content}`);
   *   console.log(`  Semantic: ${r.componentScores.semantic.toFixed(2)}`);
   *   console.log(`  Keyword: ${r.componentScores.keyword.toFixed(2)}`);
   *   console.log(`  Graph: ${r.componentScores.graph.toFixed(2)}`);
   *   console.log(`  Recency: ${r.componentScores.recency.toFixed(2)}`);
   *
   *   if (r.relationships?.length) {
   *     console.log(`  Related: ${r.relationships.length} memories`);
   *   }
   *
   *   if (r.explanation) {
   *     console.log(`  Why: ${r.explanation}`);
   *   }
   * });
   * ```
   */
  async hybrid(query: string, options?: HybridSearchOptions): Promise<HybridSearchResponse> {
    const response = await this.client.post<HybridSearchResponse>('/hybrid', {
      query,
      namespace: options?.namespace,
      agent_id: options?.agentId,
      limit: options?.limit,
      threshold: options?.threshold,
      memory_types: options?.memoryTypes,
      semantic_weight: options?.semanticWeight,
      keyword_weight: options?.keywordWeight,
      graph_weight: options?.graphWeight,
      recency_weight: options?.recencyWeight,
      tags: options?.tags,
      metadata: options?.metadata,
      time_range: options?.timeRange ? {
        from: options.timeRange.from,
        to: options.timeRange.to,
      } : undefined,
      include_relationships: options?.includeRelationships,
      expand_query: options?.expandQuery,
      rerank: options?.rerank,
    });
    return response.data;
  }
}
