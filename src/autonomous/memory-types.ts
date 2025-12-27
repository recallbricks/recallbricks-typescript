import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Memory Types - Episodic, Semantic, Procedural
// ============================================================================

/**
 * Base memory interface shared across all memory types
 */
interface BaseMemory {
  /** Unique memory identifier */
  id: string;
  /** Namespace for organization */
  namespace: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** Associated agent ID */
  agentId?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Episodic Memory Types
// ============================================================================

/**
 * Configuration for creating an episodic memory
 */
export interface EpisodicMemoryConfig {
  /** Namespace */
  namespace: string;
  /** Description of the episode */
  content: string;
  /** When the episode occurred */
  timestamp?: string;
  /** Location/context of the episode */
  location?: string;
  /** Entities involved */
  entities?: string[];
  /** Emotional valence (-1 to 1) */
  emotionalValence?: number;
  /** Importance score (0-1) */
  importance?: number;
  /** Agent ID */
  agentId?: string;
  /** Tags */
  tags?: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * An episodic memory - a specific event or experience
 */
export interface EpisodicMemory extends BaseMemory {
  /** Type discriminator */
  type: 'episodic';
  /** Episode content */
  content: string;
  /** When the episode occurred */
  episodeTimestamp: string;
  /** Location/context */
  location?: string;
  /** Entities involved */
  entities: string[];
  /** Emotional valence */
  emotionalValence: number;
  /** Importance score */
  importance: number;
  /** Linked semantic memories */
  linkedSemanticIds?: string[];
}

/**
 * Filters for querying episodic memories
 */
export interface EpisodicMemoryFilters {
  /** Namespace */
  namespace?: string;
  /** Agent ID */
  agentId?: string;
  /** Filter by entities */
  entities?: string[];
  /** Filter by location */
  location?: string;
  /** Minimum importance */
  minImportance?: number;
  /** Time range start */
  fromTimestamp?: string;
  /** Time range end */
  toTimestamp?: string;
  /** Semantic search query */
  query?: string;
  /** Maximum results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// ============================================================================
// Semantic Memory Types
// ============================================================================

/**
 * Configuration for creating a semantic memory
 */
export interface SemanticMemoryConfig {
  /** Namespace */
  namespace: string;
  /** The fact or concept */
  content: string;
  /** Category of knowledge */
  category?: string;
  /** Confidence level (0-1) */
  confidence?: number;
  /** Source of the knowledge */
  source?: string;
  /** Related concepts */
  relatedConcepts?: string[];
  /** Agent ID */
  agentId?: string;
  /** Tags */
  tags?: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A semantic memory - a fact or concept
 */
export interface SemanticMemory extends BaseMemory {
  /** Type discriminator */
  type: 'semantic';
  /** The fact or concept */
  content: string;
  /** Category */
  category?: string;
  /** Confidence level */
  confidence: number;
  /** Knowledge source */
  source?: string;
  /** Related concepts */
  relatedConcepts: string[];
  /** Times this knowledge was accessed */
  accessCount: number;
  /** Last verification timestamp */
  lastVerified?: string;
}

/**
 * Filters for querying semantic memories
 */
export interface SemanticMemoryFilters {
  /** Namespace */
  namespace?: string;
  /** Agent ID */
  agentId?: string;
  /** Filter by category */
  category?: string;
  /** Minimum confidence */
  minConfidence?: number;
  /** Related to these concepts */
  relatedTo?: string[];
  /** Semantic search query */
  query?: string;
  /** Maximum results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// ============================================================================
// Procedural Memory Types
// ============================================================================

/**
 * A step in a procedure
 */
export interface ProcedureStep {
  /** Step order */
  order: number;
  /** Step description */
  description: string;
  /** Expected input */
  input?: Record<string, unknown>;
  /** Expected output */
  output?: Record<string, unknown>;
  /** Conditions for this step */
  conditions?: string[];
}

/**
 * Configuration for creating a procedural memory
 */
export interface ProceduralMemoryConfig {
  /** Namespace */
  namespace: string;
  /** Name of the procedure */
  name: string;
  /** Description */
  description: string;
  /** Steps in the procedure */
  steps: ProcedureStep[];
  /** Trigger conditions */
  triggers?: string[];
  /** Success rate (0-1) */
  successRate?: number;
  /** Agent ID */
  agentId?: string;
  /** Tags */
  tags?: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A procedural memory - how to do something
 */
export interface ProceduralMemory extends BaseMemory {
  /** Type discriminator */
  type: 'procedural';
  /** Procedure name */
  name: string;
  /** Description */
  description: string;
  /** Steps to follow */
  steps: ProcedureStep[];
  /** When to apply this procedure */
  triggers: string[];
  /** Historical success rate */
  successRate: number;
  /** Times executed */
  executionCount: number;
  /** Last execution timestamp */
  lastExecuted?: string;
}

/**
 * Filters for querying procedural memories
 */
export interface ProceduralMemoryFilters {
  /** Namespace */
  namespace?: string;
  /** Agent ID */
  agentId?: string;
  /** Filter by trigger patterns */
  trigger?: string;
  /** Minimum success rate */
  minSuccessRate?: number;
  /** Search by name or description */
  query?: string;
  /** Maximum results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Client for typed memory operations (episodic, semantic, procedural)
 *
 * This client provides access to the three major types of human-like memory:
 * - Episodic: Specific events and experiences ("what happened")
 * - Semantic: Facts and concepts ("what I know")
 * - Procedural: Skills and procedures ("how to do things")
 *
 * @example
 * ```typescript
 * const memoryTypes = new MemoryTypesClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'http://localhost:10002'
 * });
 *
 * // Store an episodic memory
 * const episode = await memoryTypes.createEpisodic({
 *   namespace: 'conversations',
 *   content: 'User asked about weather in Paris',
 *   entities: ['user', 'Paris', 'weather'],
 *   emotionalValence: 0.2
 * });
 *
 * // Store a semantic fact
 * const fact = await memoryTypes.createSemantic({
 *   namespace: 'knowledge',
 *   content: 'Paris is the capital of France',
 *   category: 'geography',
 *   confidence: 1.0
 * });
 * ```
 */
export class MemoryTypesClient {
  private readonly client: AxiosInstance;

  /**
   * Creates a new MemoryTypesClient instance
   *
   * @param config - Client configuration
   */
  constructor(config: { apiKey: string; baseUrl: string }) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/autonomous/memory-types`,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  // ============================================================================
  // Episodic Memory Methods
  // ============================================================================

  /**
   * Creates an episodic memory
   *
   * @param memory - The episodic memory configuration
   * @returns The created episodic memory
   *
   * @example
   * ```typescript
   * const episode = await memoryTypes.createEpisodic({
   *   namespace: 'user-interactions',
   *   content: 'User successfully completed onboarding',
   *   entities: ['user-123', 'onboarding'],
   *   emotionalValence: 0.8,
   *   importance: 0.9
   * });
   * ```
   */
  async createEpisodic(memory: EpisodicMemoryConfig): Promise<EpisodicMemory> {
    const response = await this.client.post<EpisodicMemory>('/episodic', {
      namespace: memory.namespace,
      content: memory.content,
      timestamp: memory.timestamp,
      location: memory.location,
      entities: memory.entities,
      emotional_valence: memory.emotionalValence,
      importance: memory.importance,
      agent_id: memory.agentId,
      tags: memory.tags,
      metadata: memory.metadata,
    });
    return response.data;
  }

  /**
   * Retrieves episodic memories matching the filters
   *
   * @param filters - Query filters
   * @returns Array of matching episodic memories
   *
   * @example
   * ```typescript
   * const episodes = await memoryTypes.getEpisodic({
   *   namespace: 'conversations',
   *   entities: ['user-123'],
   *   minImportance: 0.5,
   *   limit: 10
   * });
   * ```
   */
  async getEpisodic(filters?: EpisodicMemoryFilters): Promise<EpisodicMemory[]> {
    const response = await this.client.get<{ memories: EpisodicMemory[] }>('/episodic', {
      params: {
        namespace: filters?.namespace,
        agent_id: filters?.agentId,
        entities: filters?.entities?.join(','),
        location: filters?.location,
        min_importance: filters?.minImportance,
        from_timestamp: filters?.fromTimestamp,
        to_timestamp: filters?.toTimestamp,
        query: filters?.query,
        limit: filters?.limit,
        offset: filters?.offset,
      },
    });
    return response.data.memories;
  }

  // ============================================================================
  // Semantic Memory Methods
  // ============================================================================

  /**
   * Creates a semantic memory
   *
   * @param memory - The semantic memory configuration
   * @returns The created semantic memory
   *
   * @example
   * ```typescript
   * const fact = await memoryTypes.createSemantic({
   *   namespace: 'domain-knowledge',
   *   content: 'TypeScript is a superset of JavaScript',
   *   category: 'programming-languages',
   *   confidence: 1.0,
   *   relatedConcepts: ['JavaScript', 'type-safety']
   * });
   * ```
   */
  async createSemantic(memory: SemanticMemoryConfig): Promise<SemanticMemory> {
    const response = await this.client.post<SemanticMemory>('/semantic', {
      namespace: memory.namespace,
      content: memory.content,
      category: memory.category,
      confidence: memory.confidence,
      source: memory.source,
      related_concepts: memory.relatedConcepts,
      agent_id: memory.agentId,
      tags: memory.tags,
      metadata: memory.metadata,
    });
    return response.data;
  }

  /**
   * Retrieves semantic memories matching the filters
   *
   * @param filters - Query filters
   * @returns Array of matching semantic memories
   *
   * @example
   * ```typescript
   * const facts = await memoryTypes.getSemantic({
   *   category: 'programming-languages',
   *   minConfidence: 0.8,
   *   query: 'type system',
   *   limit: 20
   * });
   * ```
   */
  async getSemantic(filters?: SemanticMemoryFilters): Promise<SemanticMemory[]> {
    const response = await this.client.get<{ memories: SemanticMemory[] }>('/semantic', {
      params: {
        namespace: filters?.namespace,
        agent_id: filters?.agentId,
        category: filters?.category,
        min_confidence: filters?.minConfidence,
        related_to: filters?.relatedTo?.join(','),
        query: filters?.query,
        limit: filters?.limit,
        offset: filters?.offset,
      },
    });
    return response.data.memories;
  }

  // ============================================================================
  // Procedural Memory Methods
  // ============================================================================

  /**
   * Creates a procedural memory
   *
   * @param memory - The procedural memory configuration
   * @returns The created procedural memory
   *
   * @example
   * ```typescript
   * const procedure = await memoryTypes.createProcedural({
   *   namespace: 'workflows',
   *   name: 'Handle Error Response',
   *   description: 'Steps to handle API error responses gracefully',
   *   steps: [
   *     { order: 1, description: 'Log the error' },
   *     { order: 2, description: 'Determine retry eligibility' },
   *     { order: 3, description: 'Execute retry or fallback' }
   *   ],
   *   triggers: ['API error', 'network failure']
   * });
   * ```
   */
  async createProcedural(memory: ProceduralMemoryConfig): Promise<ProceduralMemory> {
    const response = await this.client.post<ProceduralMemory>('/procedural', {
      namespace: memory.namespace,
      name: memory.name,
      description: memory.description,
      steps: memory.steps,
      triggers: memory.triggers,
      success_rate: memory.successRate,
      agent_id: memory.agentId,
      tags: memory.tags,
      metadata: memory.metadata,
    });
    return response.data;
  }

  /**
   * Retrieves procedural memories matching the filters
   *
   * @param filters - Query filters
   * @returns Array of matching procedural memories
   *
   * @example
   * ```typescript
   * const procedures = await memoryTypes.getProcedural({
   *   trigger: 'error',
   *   minSuccessRate: 0.8,
   *   limit: 5
   * });
   * ```
   */
  async getProcedural(filters?: ProceduralMemoryFilters): Promise<ProceduralMemory[]> {
    const response = await this.client.get<{ memories: ProceduralMemory[] }>('/procedural', {
      params: {
        namespace: filters?.namespace,
        agent_id: filters?.agentId,
        trigger: filters?.trigger,
        min_success_rate: filters?.minSuccessRate,
        query: filters?.query,
        limit: filters?.limit,
        offset: filters?.offset,
      },
    });
    return response.data.memories;
  }
}
