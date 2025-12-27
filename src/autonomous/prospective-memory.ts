import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Prospective Memory Types
// ============================================================================

/**
 * Trigger condition for a prospective memory intention
 */
export interface TriggerCondition {
  /** Type of trigger */
  type: 'time' | 'event' | 'context' | 'keyword' | 'semantic';
  /** Condition value/pattern */
  value: string;
  /** Additional parameters for the trigger */
  parameters?: Record<string, unknown>;
}

/**
 * Configuration for creating a prospective memory intention
 */
export interface IntentionConfig {
  /** Namespace for organizing intentions */
  namespace: string;
  /** Description of what to remember to do */
  description: string;
  /** When/how to trigger this intention */
  triggers: TriggerCondition[];
  /** Action to take when triggered */
  action: {
    /** Type of action */
    type: string;
    /** Action parameters */
    parameters?: Record<string, unknown>;
  };
  /** Priority level (1-10) */
  priority?: number;
  /** Optional expiration time (ISO 8601) */
  expiresAt?: string;
  /** Agent ID */
  agentId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A prospective memory intention
 */
export interface Intention {
  /** Unique intention identifier */
  id: string;
  /** Namespace */
  namespace: string;
  /** Description of the intention */
  description: string;
  /** Trigger conditions */
  triggers: TriggerCondition[];
  /** Action to take */
  action: {
    type: string;
    parameters?: Record<string, unknown>;
  };
  /** Priority level */
  priority: number;
  /** Current status */
  status: 'pending' | 'triggered' | 'completed' | 'expired' | 'cancelled';
  /** Creation timestamp */
  createdAt: string;
  /** Expiration timestamp */
  expiresAt?: string;
  /** When the intention was triggered */
  triggeredAt?: string;
  /** When the intention was completed */
  completedAt?: string;
  /** Agent ID */
  agentId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of checking triggers
 */
export interface TriggerCheckResult {
  /** Intentions that were triggered */
  triggered: Intention[];
  /** Context that caused the trigger */
  triggerContext?: Record<string, unknown>;
  /** Timestamp of the check */
  checkedAt: string;
}

/**
 * Client for prospective memory operations
 *
 * Prospective memory enables "remembering to remember" - setting intentions
 * that are triggered by future events, times, or contexts. This is essential
 * for autonomous agents that need to remember to perform actions later.
 *
 * @example
 * ```typescript
 * const prospective = new ProspectiveMemoryClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'http://localhost:10002'
 * });
 *
 * // Create an intention
 * const intention = await prospective.create({
 *   namespace: 'reminders',
 *   description: 'Follow up on task when user mentions "status"',
 *   triggers: [{ type: 'keyword', value: 'status' }],
 *   action: { type: 'notify', parameters: { message: 'Check task status' } }
 * });
 * ```
 */
export class ProspectiveMemoryClient {
  private readonly client: AxiosInstance;

  /**
   * Creates a new ProspectiveMemoryClient instance
   *
   * @param config - Client configuration
   */
  constructor(config: { apiKey: string; baseUrl: string }) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/autonomous/prospective-memory`,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Creates a new prospective memory intention
   *
   * @param intention - The intention configuration
   * @returns The created intention
   *
   * @example
   * ```typescript
   * const intention = await prospective.create({
   *   namespace: 'project-tasks',
   *   description: 'Remind about deadline when context includes project name',
   *   triggers: [
   *     { type: 'semantic', value: 'project alpha discussion' },
   *     { type: 'time', value: '2025-01-15T09:00:00Z' }
   *   ],
   *   action: {
   *     type: 'inject_context',
   *     parameters: { memoryIds: ['mem-deadline'] }
   *   },
   *   priority: 8
   * });
   * ```
   */
  async create(intention: IntentionConfig): Promise<Intention> {
    const response = await this.client.post<Intention>('/intentions', {
      namespace: intention.namespace,
      description: intention.description,
      triggers: intention.triggers,
      action: intention.action,
      priority: intention.priority,
      expires_at: intention.expiresAt,
      agent_id: intention.agentId,
      metadata: intention.metadata,
    });
    return response.data;
  }

  /**
   * Gets all pending intentions for a namespace
   *
   * @param namespace - The namespace to query
   * @returns Array of pending intentions
   *
   * @example
   * ```typescript
   * const pending = await prospective.getPending('reminders');
   * console.log(`${pending.length} pending intentions`);
   * ```
   */
  async getPending(namespace: string): Promise<Intention[]> {
    const response = await this.client.get<{ intentions: Intention[] }>('/intentions', {
      params: { namespace, status: 'pending' },
    });
    return response.data.intentions;
  }

  /**
   * Checks triggers against the current context
   *
   * @param context - Optional context to check against
   * @returns Intentions that were triggered
   *
   * @example
   * ```typescript
   * const result = await prospective.checkTriggers({
   *   currentText: 'Let me check the status of the project',
   *   timestamp: new Date().toISOString()
   * });
   *
   * if (result.triggered.length > 0) {
   *   console.log('Triggered intentions:', result.triggered);
   * }
   * ```
   */
  async checkTriggers(context?: Record<string, unknown>): Promise<TriggerCheckResult> {
    const response = await this.client.post<TriggerCheckResult>('/check-triggers', {
      context,
    });
    return response.data;
  }

  /**
   * Marks an intention as completed
   *
   * @param id - The intention ID
   * @param result - Optional result data
   * @returns The completed intention
   *
   * @example
   * ```typescript
   * const completed = await prospective.complete('intention-123', {
   *   outcome: 'success',
   *   notes: 'User acknowledged the reminder'
   * });
   * ```
   */
  async complete(id: string, result?: Record<string, unknown>): Promise<Intention> {
    const response = await this.client.post<Intention>(`/intentions/${id}/complete`, {
      result,
    });
    return response.data;
  }
}
