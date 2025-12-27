import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Working Memory Types
// ============================================================================

/**
 * Configuration for creating a working memory session
 */
export interface WorkingMemorySessionConfig {
  /** Unique namespace for the session */
  namespace: string;
  /** Maximum number of items in working memory */
  capacity?: number;
  /** Time-to-live in seconds for items */
  ttlSeconds?: number;
  /** Agent ID associated with this session */
  agentId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A working memory session
 */
export interface WorkingMemorySession {
  /** Unique session identifier */
  id: string;
  /** Session namespace */
  namespace: string;
  /** Maximum capacity */
  capacity: number;
  /** Current number of items */
  currentSize: number;
  /** Time-to-live in seconds */
  ttlSeconds: number;
  /** Agent ID */
  agentId?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last activity timestamp */
  lastActivityAt: string;
  /** Session metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for adding a memory to working memory
 */
export interface AddMemoryOptions {
  /** Priority level (higher = more important) */
  priority?: number;
  /** Tags for the memory item */
  tags?: string[];
  /** Relevance score */
  relevanceScore?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A memory item in working memory
 */
export interface WorkingMemoryItem {
  /** Item ID in working memory */
  id: string;
  /** Reference to the source memory */
  memoryId: string;
  /** Priority level */
  priority: number;
  /** Relevance score */
  relevanceScore: number;
  /** When the item was added */
  addedAt: string;
  /** When the item was last accessed */
  lastAccessedAt: string;
  /** Access count */
  accessCount: number;
  /** Item tags */
  tags?: string[];
  /** Item metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of promoting an item
 */
export interface PromoteResult {
  /** Whether promotion was successful */
  success: boolean;
  /** The promoted item */
  item: WorkingMemoryItem;
  /** New priority after promotion */
  newPriority: number;
}

/**
 * Result of auto-managing working memory
 */
export interface AutoManageResult {
  /** Items that were kept */
  kept: WorkingMemoryItem[];
  /** Items that were evicted */
  evicted: WorkingMemoryItem[];
  /** Items that were promoted */
  promoted: WorkingMemoryItem[];
  /** Summary of actions taken */
  summary: {
    itemsKept: number;
    itemsEvicted: number;
    itemsPromoted: number;
  };
}

/**
 * Client for working memory operations
 *
 * Working memory provides a limited-capacity, attention-based memory system
 * for autonomous agents. It manages what information is currently "active"
 * and relevant to the agent's ongoing task.
 *
 * @example
 * ```typescript
 * const workingMemory = new WorkingMemoryClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'http://localhost:10002'
 * });
 *
 * // Create a session
 * const session = await workingMemory.createSession({
 *   namespace: 'agent-123',
 *   capacity: 10
 * });
 *
 * // Add memories to working memory
 * await workingMemory.addMemory(session.id, 'mem-456', {
 *   priority: 5,
 *   relevanceScore: 0.9
 * });
 * ```
 */
export class WorkingMemoryClient {
  private readonly client: AxiosInstance;

  /**
   * Creates a new WorkingMemoryClient instance
   *
   * @param config - Client configuration
   */
  constructor(config: { apiKey: string; baseUrl: string }) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/autonomous/working-memory`,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Creates a new working memory session
   *
   * @param config - Session configuration
   * @returns The created session
   *
   * @example
   * ```typescript
   * const session = await workingMemory.createSession({
   *   namespace: 'task-planning',
   *   capacity: 7,
   *   ttlSeconds: 3600,
   *   agentId: 'agent-001'
   * });
   * ```
   */
  async createSession(config: WorkingMemorySessionConfig): Promise<WorkingMemorySession> {
    const response = await this.client.post<WorkingMemorySession>('/sessions', {
      namespace: config.namespace,
      capacity: config.capacity,
      ttl_seconds: config.ttlSeconds,
      agent_id: config.agentId,
      metadata: config.metadata,
    });
    return response.data;
  }

  /**
   * Gets a working memory session by ID
   *
   * @param sessionId - The session ID
   * @returns The session with current items
   *
   * @example
   * ```typescript
   * const session = await workingMemory.getSession('session-123');
   * console.log(`Current items: ${session.currentSize}/${session.capacity}`);
   * ```
   */
  async getSession(sessionId: string): Promise<WorkingMemorySession & { items: WorkingMemoryItem[] }> {
    const response = await this.client.get<WorkingMemorySession & { items: WorkingMemoryItem[] }>(
      `/sessions/${sessionId}`
    );
    return response.data;
  }

  /**
   * Adds a memory to working memory
   *
   * @param sessionId - The session ID
   * @param memoryId - The memory ID to add
   * @param options - Options for the memory item
   * @returns The created working memory item
   *
   * @example
   * ```typescript
   * const item = await workingMemory.addMemory('session-123', 'mem-456', {
   *   priority: 8,
   *   relevanceScore: 0.95,
   *   tags: ['important', 'current-task']
   * });
   * ```
   */
  async addMemory(
    sessionId: string,
    memoryId: string,
    options?: AddMemoryOptions
  ): Promise<WorkingMemoryItem> {
    const response = await this.client.post<WorkingMemoryItem>(
      `/sessions/${sessionId}/items`,
      {
        memory_id: memoryId,
        priority: options?.priority,
        tags: options?.tags,
        relevance_score: options?.relevanceScore,
        metadata: options?.metadata,
      }
    );
    return response.data;
  }

  /**
   * Promotes an item in working memory, increasing its priority
   *
   * @param itemId - The working memory item ID
   * @returns The result of the promotion
   *
   * @example
   * ```typescript
   * const result = await workingMemory.promote('item-789');
   * console.log(`New priority: ${result.newPriority}`);
   * ```
   */
  async promote(itemId: string): Promise<PromoteResult> {
    const response = await this.client.post<PromoteResult>(`/items/${itemId}/promote`);
    return response.data;
  }

  /**
   * Automatically manages working memory by evicting low-priority items
   * and promoting high-relevance items
   *
   * @param sessionId - The session ID
   * @returns Summary of management actions taken
   *
   * @example
   * ```typescript
   * const result = await workingMemory.autoManage('session-123');
   * console.log(`Evicted: ${result.summary.itemsEvicted}`);
   * console.log(`Promoted: ${result.summary.itemsPromoted}`);
   * ```
   */
  async autoManage(sessionId: string): Promise<AutoManageResult> {
    const response = await this.client.post<AutoManageResult>(
      `/sessions/${sessionId}/auto-manage`
    );
    return response.data;
  }

  /**
   * Deletes a working memory session and all its items
   *
   * @param sessionId - The session ID to delete
   * @returns True if deletion was successful
   *
   * @example
   * ```typescript
   * await workingMemory.deleteSession('session-123');
   * ```
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    await this.client.delete(`/sessions/${sessionId}`);
    return true;
  }
}
