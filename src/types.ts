/**
 * Configuration options for the RecallBricks client
 */
export interface RecallBricksConfig {
  /** API key for authentication (required if serviceToken not provided) */
  apiKey?: string;
  /** Service token for server-to-server authentication (required if apiKey not provided) */
  serviceToken?: string;
  /** Base URL for the API (default: http://localhost:10002/api/v1) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Maximum retry delay in milliseconds (default: 10000) */
  maxRetryDelay?: number;
}

/**
 * Metadata associated with a memory
 */
export interface MemoryMetadata {
  [key: string]: string | number | boolean | null;
}

/**
 * Options for creating a memory
 */
export interface CreateMemoryOptions {
  /** User ID (required when using service token authentication) */
  userId?: string;
  /** Metadata to associate with the memory */
  metadata?: MemoryMetadata;
  /** Tags for categorizing the memory */
  tags?: string[];
  /** Timestamp for the memory (ISO 8601 format) */
  timestamp?: string;
}

/**
 * Represents a memory in the RecallBricks system
 */
export interface Memory {
  /** Unique identifier for the memory */
  id: string;
  /** Text content of the memory */
  text: string;
  /** Metadata associated with the memory */
  metadata?: MemoryMetadata;
  /** Tags for categorizing the memory */
  tags?: string[];
  /** Creation timestamp */
  created_at: string;
  /** Last updated timestamp */
  updated_at: string;
  /** Embedding vector (if available) */
  embedding?: number[];
}

/**
 * Options for listing memories
 */
export interface ListMemoriesOptions {
  /** User ID (required when using service token authentication) */
  userId?: string;
  /** Maximum number of memories to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by tags */
  tags?: string[];
  /** Filter by metadata */
  metadata?: MemoryMetadata;
  /** Sort order: 'asc' or 'desc' (default: 'desc') */
  sort?: 'asc' | 'desc';
  /** Field to sort by (default: 'created_at') */
  sortBy?: string;
}

/**
 * Response from listing memories
 */
export interface ListMemoriesResponse {
  /** Array of memories */
  memories: Memory[];
  /** Total count of memories matching the filters */
  total: number;
  /** Number of memories returned */
  limit: number;
  /** Offset used for pagination */
  offset: number;
}

/**
 * Options for searching memories
 */
export interface SearchOptions {
  /** User ID (required when using service token authentication) */
  userId?: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Filter by tags */
  tags?: string[];
  /** Filter by metadata */
  metadata?: MemoryMetadata;
}

/**
 * A search result with similarity score
 */
export interface SearchResult {
  /** The memory that matched */
  memory: Memory;
  /** Similarity score (0-1, higher is more similar) */
  score: number;
}

/**
 * Response from searching memories
 */
export interface SearchResponse {
  /** Array of search results */
  results: SearchResult[];
  /** Query that was searched */
  query: string;
}

/**
 * Represents a relationship between memories
 */
export interface Relationship {
  /** Source memory ID */
  source_id: string;
  /** Target memory ID */
  target_id: string;
  /** Type of relationship */
  type: string;
  /** Strength of the relationship (0-1) */
  strength: number;
  /** Metadata about the relationship */
  metadata?: MemoryMetadata;
}

/**
 * Response from getting relationships
 */
export interface RelationshipsResponse {
  /** Memory ID */
  memory_id: string;
  /** Outgoing relationships */
  outgoing: Relationship[];
  /** Incoming relationships */
  incoming: Relationship[];
}

/**
 * A node in the graph context
 */
export interface GraphNode {
  /** The memory */
  memory: Memory;
  /** Depth from the root node */
  depth: number;
  /** Relationships to this node */
  relationships: Relationship[];
}

/**
 * Response from getting graph context
 */
export interface GraphContextResponse {
  /** Root memory ID */
  root_id: string;
  /** Maximum depth traversed */
  depth: number;
  /** Nodes in the graph */
  nodes: GraphNode[];
  /** Total number of nodes */
  total_nodes: number;
}

/**
 * Options for updating a memory
 */
export interface UpdateMemoryOptions {
  /** New text content */
  text?: string;
  /** New or updated metadata */
  metadata?: MemoryMetadata;
  /** New or updated tags */
  tags?: string[];
}

/**
 * Error response from the API
 */
export interface ApiError {
  /** Error message */
  error: string;
  /** Error code */
  code?: string;
  /** Additional details */
  details?: unknown;
}

/**
 * Custom error class for RecallBricks API errors
 */
export class RecallBricksError extends Error {
  public statusCode?: number;
  public code?: string;
  public details?: unknown;

  constructor(message: string, statusCode?: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'RecallBricksError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, RecallBricksError.prototype);
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  retryDelay: number;
  /** Maximum delay in milliseconds */
  maxRetryDelay: number;
}

// ============================================================================
// Phase 2A: Metacognition Features
// ============================================================================

/**
 * Options for predicting future memory needs
 */
export interface PredictMemoriesOptions {
  /** User ID (required when using service token authentication) */
  userId?: string;
  /** Context to base predictions on */
  context?: string;
  /** IDs of recent memories to analyze */
  recentMemoryIds?: string[];
  /** Maximum number of predictions to return */
  limit?: number;
}

/**
 * A predicted memory that might be needed
 */
export interface PredictedMemory {
  /** Memory ID */
  id: string;
  /** Memory content */
  content: string;
  /** Confidence score (0-1) */
  confidence_score: number;
  /** Reasoning for the prediction */
  reasoning: string;
}

/**
 * Response from predicting memories
 */
export interface PredictMemoriesResponse {
  /** Array of predicted memories */
  predictions: PredictedMemory[];
}

/**
 * Options for suggesting relevant memories
 */
export interface SuggestMemoriesOptions {
  /** User ID (required when using service token authentication) */
  userId?: string;
  /** Maximum number of suggestions to return */
  limit?: number;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Include reasoning in the response */
  includeReasoning?: boolean;
}

/**
 * A suggested memory based on context
 */
export interface SuggestedMemory {
  /** Memory ID */
  id: string;
  /** Memory content */
  content: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reasoning for the suggestion */
  reasoning?: string;
}

/**
 * Response from suggesting memories
 */
export interface SuggestMemoriesResponse {
  /** Array of suggested memories */
  suggestions: SuggestedMemory[];
}

/**
 * Trends in learning metrics over time
 */
export interface LearningTrends {
  /** Trend in average helpfulness */
  helpfulness_trend?: 'improving' | 'declining' | 'stable';
  /** Trend in memory usage */
  usage_trend?: 'increasing' | 'decreasing' | 'stable';
  /** Trend in active memories */
  active_memories_trend?: 'growing' | 'shrinking' | 'stable';
}

/**
 * Learning metrics for the system
 */
export interface LearningMetrics {
  /** Average helpfulness score */
  avg_helpfulness: number;
  /** Total memory usage count */
  total_usage: number;
  /** Number of active memories */
  active_memories: number;
  /** Trends over the specified period */
  trends?: LearningTrends;
}

/**
 * A frequently accessed memory
 */
export interface FrequentlyAccessedMemory {
  /** Memory ID */
  memory_id: string;
  /** Access count */
  access_count: number;
  /** Last accessed timestamp */
  last_accessed: string;
}

/**
 * Pattern of co-accessed memories
 */
export interface CoAccessPattern {
  /** Memory IDs that are accessed together */
  memory_ids: string[];
  /** Frequency of co-access */
  frequency: number;
  /** Strength of the pattern (0-1) */
  strength: number;
}

/**
 * Temporal pattern in memory access
 */
export interface TemporalPattern {
  /** Time period (e.g., 'morning', 'afternoon', 'evening') */
  time_period: string;
  /** Memory IDs accessed during this period */
  memory_ids: string[];
  /** Frequency of access in this period */
  frequency: number;
}

/**
 * Pattern analysis for memories
 */
export interface PatternAnalysis {
  /** Frequently accessed memories */
  frequently_accessed: FrequentlyAccessedMemory[];
  /** Co-access patterns */
  co_access_patterns: CoAccessPattern[];
  /** Temporal access patterns */
  temporal_patterns: TemporalPattern[];
}

/**
 * Options for weighted search
 */
export interface SearchWeightedOptions {
  /** User ID (required when using service token authentication) */
  userId?: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Weight results by usage frequency */
  weightByUsage?: boolean;
  /** Apply decay to older memories */
  decayOldMemories?: boolean;
  /** Use adaptive weights based on context */
  adaptiveWeights?: boolean;
  /** Minimum helpfulness score */
  minHelpfulnessScore?: number;
}

/**
 * A weighted search result
 */
export interface WeightedSearchResult {
  /** Memory ID */
  id: string;
  /** Text content of the memory */
  text: string;
  /** Metadata associated with the memory */
  metadata?: MemoryMetadata;
  /** Tags for categorizing the memory */
  tags?: string[];
  /** Creation timestamp */
  created_at: string;
  /** Last updated timestamp */
  updated_at: string;
  /** Combined relevance score */
  relevance_score: number;
}

/**
 * Response from weighted search
 */
export interface SearchWeightedResponse {
  /** Array of weighted search results */
  results: WeightedSearchResult[];
  /** Query that was searched */
  query: string;
}
