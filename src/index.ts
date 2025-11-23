import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  RecallBricksConfig,
  Memory,
  CreateMemoryOptions,
  ListMemoriesOptions,
  ListMemoriesResponse,
  SearchOptions,
  SearchResponse,
  RelationshipsResponse,
  GraphContextResponse,
  UpdateMemoryOptions,
  RecallBricksError,
  RetryConfig,
  ApiError,
  // Phase 2A: Metacognition Features
  PredictMemoriesOptions,
  PredictMemoriesResponse,
  SuggestMemoriesOptions,
  SuggestMemoriesResponse,
  LearningMetrics,
  PatternAnalysis,
  SearchWeightedOptions,
  SearchWeightedResponse,
} from './types';

/**
 * RecallBricks SDK Client
 *
 * Enterprise-grade TypeScript client for interacting with the RecallBricks API.
 * Includes retry logic, timeout configuration, and comprehensive error handling.
 *
 * @example
 * ```typescript
 * const client = new RecallBricks({
 *   apiKey: 'your-api-key',
 *   timeout: 30000,
 *   maxRetries: 3
 * });
 *
 * const memory = await client.createMemory('Important information', {
 *   tags: ['important'],
 *   metadata: { source: 'user' }
 * });
 * ```
 */
export class RecallBricks {
  private readonly client: AxiosInstance;
  private readonly retryConfig: RetryConfig;
  private readonly usingServiceToken: boolean;

  /**
   * Creates a new RecallBricks client instance
   *
   * @param config - Configuration options for the client
   * @throws {RecallBricksError} If authentication is not properly configured
   */
  constructor(config: RecallBricksConfig) {
    // Validate exactly one auth method is provided
    if (!config.apiKey && !config.serviceToken) {
      throw new RecallBricksError(
        'Either apiKey or serviceToken must be provided',
        400,
        'MISSING_AUTH'
      );
    }

    if (config.apiKey && config.serviceToken) {
      throw new RecallBricksError(
        'Provide either apiKey or serviceToken, not both',
        400,
        'INVALID_AUTH_CONFIG'
      );
    }

    const baseUrl = config.baseUrl || 'http://localhost:10002/api/v1';
    const timeout = config.timeout || 30000;

    // Store which auth type we're using
    this.usingServiceToken = !!config.serviceToken;

    // Set up headers based on auth type
    const authHeader = config.serviceToken
      ? { 'X-Service-Token': config.serviceToken }
      : { 'X-API-Key': config.apiKey! };

    this.client = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
    });

    this.retryConfig = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      maxRetryDelay: config.maxRetryDelay || 10000,
    };
  }

  /**
   * Validates that userId is provided when using service token authentication
   *
   * @param userId - The user ID to validate
   * @throws {RecallBricksError} If service token is being used but userId is not provided
   */
  private validateUserId(userId?: string): void {
    if (this.usingServiceToken && !userId) {
      throw new RecallBricksError(
        'userId is required when using service token authentication',
        400,
        'MISSING_USER_ID'
      );
    }
  }

  /**
   * Determines if an error is retryable
   *
   * @param error - The error to check
   * @returns True if the error should trigger a retry
   */
  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      // Network errors are retryable
      return true;
    }

    const status = error.response.status;
    // Retry on 429 (rate limit), 500, 502, 503, 504
    return status === 429 || (status >= 500 && status <= 504);
  }

  /**
   * Calculates exponential backoff delay
   *
   * @param attempt - Current attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  private calculateBackoff(attempt: number): number {
    const delay = this.retryConfig.retryDelay * Math.pow(2, attempt);
    return Math.min(delay, this.retryConfig.maxRetryDelay);
  }

  /**
   * Sleeps for a specified duration
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executes an HTTP request with retry logic
   *
   * @param requestFn - Function that makes the HTTP request
   * @returns The response data
   * @throws {RecallBricksError} If the request fails after all retries
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;

        // Check if this is an axios error and if it's retryable
        if (axios.isAxiosError(error)) {
          if (!this.isRetryableError(error)) {
            // Not retryable, throw immediately
            throw this.handleAxiosError(error);
          }

          // If we've exhausted retries, throw
          if (attempt === this.retryConfig.maxRetries) {
            throw this.handleAxiosError(error);
          }

          // Calculate backoff and retry
          const backoff = this.calculateBackoff(attempt);
          await this.sleep(backoff);
        } else {
          // Non-axios error, throw immediately
          throw error;
        }
      }
    }

    // Should never reach here, but just in case
    throw lastError || new RecallBricksError('Request failed after retries', 500);
  }

  /**
   * Handles Axios errors and converts them to RecallBricksError
   *
   * @param error - The Axios error
   * @returns A RecallBricksError instance
   */
  private handleAxiosError(error: AxiosError): RecallBricksError {
    if (error.response) {
      const data = error.response.data as ApiError;
      return new RecallBricksError(
        data.error || error.message,
        error.response.status,
        data.code,
        data.details
      );
    } else if (error.request) {
      return new RecallBricksError(
        'No response received from server',
        0,
        'NO_RESPONSE'
      );
    } else {
      return new RecallBricksError(
        error.message,
        0,
        'REQUEST_SETUP_ERROR'
      );
    }
  }

  /**
   * Creates a new memory
   *
   * @param text - The text content of the memory
   * @param options - Optional metadata, tags, timestamp, and userId (required for service tokens)
   * @returns The created memory
   * @throws {RecallBricksError} If the request fails
   *
   * @example
   * ```typescript
   * // With API key
   * const memory = await client.createMemory('User prefers dark mode', {
   *   tags: ['preference', 'ui'],
   *   metadata: { userId: '123' }
   * });
   *
   * // With service token
   * const memory = await client.createMemory('User prefers dark mode', {
   *   userId: 'user-123',
   *   tags: ['preference', 'ui']
   * });
   * ```
   */
  async createMemory(text: string, options?: CreateMemoryOptions): Promise<Memory> {
    if (!text || text.trim().length === 0) {
      throw new RecallBricksError('Text is required', 400, 'INVALID_INPUT');
    }

    this.validateUserId(options?.userId);

    return this.executeWithRetry(async () => {
      const payload: Record<string, unknown> = { text };

      if (options?.userId) payload.user_id = options.userId;
      if (options?.metadata) payload.metadata = options.metadata;
      if (options?.tags) payload.tags = options.tags;
      if (options?.timestamp) payload.timestamp = options.timestamp;

      const response = await this.client.post<Memory>('/memories', payload);
      return response.data;
    });
  }

  /**
   * Lists memories with optional filtering and pagination
   *
   * @param options - Filtering, pagination options, and userId (required for service tokens)
   * @returns List of memories with pagination info
   * @throws {RecallBricksError} If the request fails
   *
   * @example
   * ```typescript
   * // With API key
   * const result = await client.listMemories({
   *   limit: 10,
   *   offset: 0,
   *   tags: ['important'],
   *   sort: 'desc'
   * });
   *
   * // With service token
   * const result = await client.listMemories({
   *   userId: 'user-123',
   *   limit: 10,
   *   tags: ['important']
   * });
   * ```
   */
  async listMemories(options?: ListMemoriesOptions): Promise<ListMemoriesResponse> {
    this.validateUserId(options?.userId);

    return this.executeWithRetry(async () => {
      const params: Record<string, string | number> = {};

      if (options?.userId) params.user_id = options.userId;
      if (options?.limit !== undefined) params.limit = options.limit;
      if (options?.offset !== undefined) params.offset = options.offset;
      if (options?.sort) params.sort = options.sort;
      if (options?.sortBy) params.sortBy = options.sortBy;
      if (options?.tags) params.tags = options.tags.join(',');
      if (options?.metadata) params.metadata = JSON.stringify(options.metadata);

      const response = await this.client.get<ListMemoriesResponse>('/memories', { params });
      return response.data;
    });
  }

  /**
   * Searches for memories using semantic search
   *
   * @param query - The search query
   * @param options - Search options (limit, threshold, filters, userId for service tokens)
   * @returns Search results with similarity scores
   * @throws {RecallBricksError} If the request fails
   *
   * @example
   * ```typescript
   * // With API key
   * const results = await client.search('user preferences', {
   *   limit: 5,
   *   threshold: 0.7,
   *   tags: ['preference']
   * });
   *
   * // With service token
   * const results = await client.search('user preferences', {
   *   userId: 'user-123',
   *   limit: 5,
   *   threshold: 0.7
   * });
   * ```
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    if (!query || query.trim().length === 0) {
      throw new RecallBricksError('Query is required', 400, 'INVALID_INPUT');
    }

    this.validateUserId(options?.userId);

    return this.executeWithRetry(async () => {
      const payload: Record<string, unknown> = { query };

      if (options?.userId) payload.user_id = options.userId;
      if (options?.limit !== undefined) payload.limit = options.limit;
      if (options?.threshold !== undefined) payload.threshold = options.threshold;
      if (options?.tags) payload.tags = options.tags;
      if (options?.metadata) payload.metadata = options.metadata;

      const response = await this.client.post<SearchResponse>('/memories/search', payload);
      return response.data;
    });
  }

  /**
   * Gets all relationships for a specific memory
   *
   * @param memoryId - The ID of the memory
   * @returns Incoming and outgoing relationships
   * @throws {RecallBricksError} If the request fails
   *
   * @example
   * ```typescript
   * const relationships = await client.getRelationships('memory-123');
   * console.log(`Outgoing: ${relationships.outgoing.length}`);
   * console.log(`Incoming: ${relationships.incoming.length}`);
   * ```
   */
  async getRelationships(memoryId: string): Promise<RelationshipsResponse> {
    if (!memoryId || memoryId.trim().length === 0) {
      throw new RecallBricksError('Memory ID is required', 400, 'INVALID_INPUT');
    }

    return this.executeWithRetry(async () => {
      const response = await this.client.get<RelationshipsResponse>(
        `/memories/${memoryId}/relationships`
      );
      return response.data;
    });
  }

  /**
   * Gets the graph context around a memory up to a specified depth
   *
   * @param memoryId - The root memory ID
   * @param depth - Maximum depth to traverse (default: 2)
   * @returns Graph context with nodes and relationships
   * @throws {RecallBricksError} If the request fails
   *
   * @example
   * ```typescript
   * const graph = await client.getGraphContext('memory-123', 3);
   * console.log(`Found ${graph.total_nodes} related nodes`);
   * ```
   */
  async getGraphContext(memoryId: string, depth: number = 2): Promise<GraphContextResponse> {
    if (!memoryId || memoryId.trim().length === 0) {
      throw new RecallBricksError('Memory ID is required', 400, 'INVALID_INPUT');
    }

    if (depth < 1 || depth > 10) {
      throw new RecallBricksError('Depth must be between 1 and 10', 400, 'INVALID_INPUT');
    }

    return this.executeWithRetry(async () => {
      const response = await this.client.get<GraphContextResponse>(
        `/memories/${memoryId}/graph`,
        { params: { depth } }
      );
      return response.data;
    });
  }

  /**
   * Deletes a memory by ID
   *
   * @param memoryId - The ID of the memory to delete
   * @returns True if deletion was successful
   * @throws {RecallBricksError} If the request fails
   *
   * @example
   * ```typescript
   * await client.deleteMemory('memory-123');
   * console.log('Memory deleted successfully');
   * ```
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    if (!memoryId || memoryId.trim().length === 0) {
      throw new RecallBricksError('Memory ID is required', 400, 'INVALID_INPUT');
    }

    return this.executeWithRetry(async () => {
      await this.client.delete(`/memories/${memoryId}`);
      return true;
    });
  }

  /**
   * Updates an existing memory
   *
   * @param memoryId - The ID of the memory to update
   * @param updates - Fields to update (text, metadata, tags)
   * @returns The updated memory
   * @throws {RecallBricksError} If the request fails
   *
   * @example
   * ```typescript
   * const updated = await client.updateMemory('memory-123', {
   *   text: 'Updated text',
   *   tags: ['updated', 'important'],
   *   metadata: { version: 2 }
   * });
   * ```
   */
  async updateMemory(memoryId: string, updates: UpdateMemoryOptions): Promise<Memory> {
    if (!memoryId || memoryId.trim().length === 0) {
      throw new RecallBricksError('Memory ID is required', 400, 'INVALID_INPUT');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new RecallBricksError('Updates are required', 400, 'INVALID_INPUT');
    }

    // Validate that text is not empty if provided
    if (updates.text !== undefined && updates.text.trim().length === 0) {
      throw new RecallBricksError('Text cannot be empty', 400, 'INVALID_INPUT');
    }

    return this.executeWithRetry(async () => {
      const response = await this.client.patch<Memory>(
        `/memories/${memoryId}`,
        updates
      );
      return response.data;
    });
  }

  // ============================================================================
  // Phase 2A: Metacognition Features
  // ============================================================================

  /**
   * Predicts memories that might be needed based on context and recent usage
   *
   * @param options - Options for prediction (context, recentMemoryIds, limit, userId for service tokens)
   * @returns Predicted memories with confidence scores
   * @throws {RecallBricksError} If the request fails
   *
   * @example
   * ```typescript
   * // With API key
   * const predictions = await client.predictMemories({
   *   context: 'working on authentication',
   *   limit: 5
   * });
   *
   * // With service token
   * const predictions = await client.predictMemories({
   *   userId: 'user-123',
   *   context: 'working on authentication',
   *   limit: 5
   * });
   * ```
   */
  async predictMemories(options?: PredictMemoriesOptions): Promise<PredictMemoriesResponse> {
    this.validateUserId(options?.userId);

    return this.executeWithRetry(async () => {
      const payload: Record<string, unknown> = {};

      if (options?.userId) payload.user_id = options.userId;
      if (options?.context) payload.context = options.context;
      if (options?.recentMemoryIds) payload.recent_memory_ids = options.recentMemoryIds;
      if (options?.limit !== undefined) payload.limit = options.limit;

      const response = await this.client.post<PredictMemoriesResponse>(
        '/memories/predict',
        payload
      );
      return response.data;
    });
  }

  /**
   * Suggests relevant memories based on the provided context
   *
   * @param context - Context to base suggestions on
   * @param options - Options for suggestions (limit, minConfidence, includeReasoning, userId for service tokens)
   * @returns Suggested memories with confidence scores
   * @throws {RecallBricksError} If the request fails
   *
   * @example
   * ```typescript
   * // With API key
   * const suggestions = await client.suggestMemories('user authentication flow', {
   *   limit: 10,
   *   minConfidence: 0.7,
   *   includeReasoning: true
   * });
   *
   * // With service token
   * const suggestions = await client.suggestMemories('user authentication flow', {
   *   userId: 'user-123',
   *   limit: 10,
   *   minConfidence: 0.7
   * });
   * ```
   */
  async suggestMemories(
    context: string,
    options?: SuggestMemoriesOptions
  ): Promise<SuggestMemoriesResponse> {
    if (!context || context.trim().length === 0) {
      throw new RecallBricksError('Context is required', 400, 'INVALID_INPUT');
    }

    this.validateUserId(options?.userId);

    return this.executeWithRetry(async () => {
      const payload: Record<string, unknown> = { context };

      if (options?.userId) payload.user_id = options.userId;
      if (options?.limit !== undefined) payload.limit = options.limit;
      if (options?.minConfidence !== undefined) payload.min_confidence = options.minConfidence;
      if (options?.includeReasoning !== undefined) {
        payload.include_reasoning = options.includeReasoning;
      }

      const response = await this.client.post<SuggestMemoriesResponse>(
        '/memories/suggest',
        payload
      );
      return response.data;
    });
  }

  /**
   * Gets learning metrics for the system over a specified time period
   *
   * @param days - Number of days to analyze (default: 30)
   * @returns Learning metrics including helpfulness, usage, and trends
   * @throws {RecallBricksError} If the request fails
   *
   * @example
   * ```typescript
   * const metrics = await client.getLearningMetrics(7);
   * console.log(`Average helpfulness: ${metrics.avg_helpfulness}`);
   * console.log(`Total usage: ${metrics.total_usage}`);
   * ```
   */
  async getLearningMetrics(days: number = 30): Promise<LearningMetrics> {
    if (days < 1) {
      throw new RecallBricksError('Days must be at least 1', 400, 'INVALID_INPUT');
    }

    return this.executeWithRetry(async () => {
      const response = await this.client.get<LearningMetrics>('/analytics/learning-metrics', {
        params: { days },
      });
      return response.data;
    });
  }

  /**
   * Gets pattern analysis for memory access over a specified time period
   *
   * @param days - Number of days to analyze (default: 30)
   * @returns Pattern analysis including frequently accessed memories and co-access patterns
   * @throws {RecallBricksError} If the request fails
   *
   * @example
   * ```typescript
   * const patterns = await client.getPatterns(14);
   * console.log(`Frequently accessed: ${patterns.frequently_accessed.length}`);
   * console.log(`Co-access patterns: ${patterns.co_access_patterns.length}`);
   * ```
   */
  async getPatterns(days: number = 30): Promise<PatternAnalysis> {
    if (days < 1) {
      throw new RecallBricksError('Days must be at least 1', 400, 'INVALID_INPUT');
    }

    return this.executeWithRetry(async () => {
      const response = await this.client.get<PatternAnalysis>('/analytics/patterns', {
        params: { days },
      });
      return response.data;
    });
  }

  /**
   * Performs a weighted search that combines semantic similarity with usage patterns
   *
   * @param query - The search query
   * @param options - Search options (limit, weighting options, filtering, userId for service tokens)
   * @returns Weighted search results with relevance scores
   * @throws {RecallBricksError} If the request fails
   *
   * @example
   * ```typescript
   * // With API key
   * const results = await client.searchWeighted('authentication logic', {
   *   limit: 10,
   *   weightByUsage: true,
   *   decayOldMemories: true,
   *   adaptiveWeights: true,
   *   minHelpfulnessScore: 0.5
   * });
   *
   * // With service token
   * const results = await client.searchWeighted('authentication logic', {
   *   userId: 'user-123',
   *   limit: 10,
   *   weightByUsage: true
   * });
   * ```
   */
  async searchWeighted(
    query: string,
    options?: SearchWeightedOptions
  ): Promise<SearchWeightedResponse> {
    if (!query || query.trim().length === 0) {
      throw new RecallBricksError('Query is required', 400, 'INVALID_INPUT');
    }

    this.validateUserId(options?.userId);

    return this.executeWithRetry(async () => {
      const payload: Record<string, unknown> = { query };

      if (options?.userId) payload.user_id = options.userId;
      if (options?.limit !== undefined) payload.limit = options.limit;
      if (options?.weightByUsage !== undefined) payload.weight_by_usage = options.weightByUsage;
      if (options?.decayOldMemories !== undefined) {
        payload.decay_old_memories = options.decayOldMemories;
      }
      if (options?.adaptiveWeights !== undefined) {
        payload.adaptive_weights = options.adaptiveWeights;
      }
      if (options?.minHelpfulnessScore !== undefined) {
        payload.min_helpfulness_score = options.minHelpfulnessScore;
      }

      const response = await this.client.post<SearchWeightedResponse>(
        '/memories/search-weighted',
        payload
      );
      return response.data;
    });
  }
}

// Export all types
export * from './types';

// Export as default as well
export default RecallBricks;
