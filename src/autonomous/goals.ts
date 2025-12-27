import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Goals Types
// ============================================================================

/**
 * A milestone in a goal
 */
export interface GoalMilestone {
  /** Milestone ID */
  id: string;
  /** Description */
  description: string;
  /** Target value (if measurable) */
  targetValue?: number;
  /** Current value */
  currentValue?: number;
  /** Whether the milestone is completed */
  completed: boolean;
  /** Completion timestamp */
  completedAt?: string;
}

/**
 * Configuration for creating a goal
 */
export interface GoalConfig {
  /** Namespace for organizing goals */
  namespace: string;
  /** Goal title */
  title: string;
  /** Detailed description */
  description: string;
  /** Goal type */
  type: 'achievement' | 'maintenance' | 'learning' | 'optimization';
  /** Priority (1-10) */
  priority?: number;
  /** Parent goal ID for hierarchical goals */
  parentGoalId?: string;
  /** Milestones to track progress */
  milestones?: Omit<GoalMilestone, 'id' | 'completed' | 'completedAt'>[];
  /** Success criteria */
  successCriteria?: string[];
  /** Deadline (ISO 8601) */
  deadline?: string;
  /** Agent ID */
  agentId?: string;
  /** Tags */
  tags?: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A goal being pursued by an agent
 */
export interface Goal {
  /** Goal ID */
  id: string;
  /** Namespace */
  namespace: string;
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Goal type */
  type: 'achievement' | 'maintenance' | 'learning' | 'optimization';
  /** Priority */
  priority: number;
  /** Current status */
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  /** Progress percentage (0-100) */
  progress: number;
  /** Parent goal ID */
  parentGoalId?: string;
  /** Child goal IDs */
  childGoalIds: string[];
  /** Milestones */
  milestones: GoalMilestone[];
  /** Success criteria */
  successCriteria: string[];
  /** Deadline */
  deadline?: string;
  /** Agent ID */
  agentId?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** Completion timestamp */
  completedAt?: string;
  /** Tags */
  tags?: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of advancing a goal
 */
export interface AdvanceResult {
  /** The updated goal */
  goal: Goal;
  /** Whether any milestones were completed */
  milestonesCompleted: GoalMilestone[];
  /** New progress percentage */
  newProgress: number;
  /** Whether the goal is now complete */
  goalCompleted: boolean;
  /** Suggested next actions */
  suggestedNextActions?: string[];
}

/**
 * Client for goal management operations
 *
 * Goals provide a hierarchical objective system for autonomous agents.
 * Goals can be broken down into sub-goals and milestones, allowing agents
 * to track progress toward complex objectives.
 *
 * @example
 * ```typescript
 * const goals = new GoalsClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'http://localhost:10002'
 * });
 *
 * // Create a goal
 * const goal = await goals.create({
 *   namespace: 'project-alpha',
 *   title: 'Complete user authentication',
 *   description: 'Implement secure user auth with OAuth',
 *   type: 'achievement',
 *   milestones: [
 *     { description: 'Design auth flow' },
 *     { description: 'Implement OAuth provider' },
 *     { description: 'Add session management' }
 *   ]
 * });
 * ```
 */
export class GoalsClient {
  private readonly client: AxiosInstance;

  /**
   * Creates a new GoalsClient instance
   *
   * @param config - Client configuration
   */
  constructor(config: { apiKey: string; baseUrl: string }) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/autonomous/goals`,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Creates a new goal
   *
   * @param goal - The goal configuration
   * @returns The created goal
   *
   * @example
   * ```typescript
   * const goal = await goals.create({
   *   namespace: 'learning',
   *   title: 'Master TypeScript generics',
   *   description: 'Develop deep understanding of TypeScript generic types',
   *   type: 'learning',
   *   priority: 7,
   *   milestones: [
   *     { description: 'Understand basic generics' },
   *     { description: 'Learn conditional types' },
   *     { description: 'Master mapped types' }
   *   ],
   *   successCriteria: ['Can explain generics to others', 'Use generics effectively in code']
   * });
   * ```
   */
  async create(goal: GoalConfig): Promise<Goal> {
    const response = await this.client.post<Goal>('/', {
      namespace: goal.namespace,
      title: goal.title,
      description: goal.description,
      type: goal.type,
      priority: goal.priority,
      parent_goal_id: goal.parentGoalId,
      milestones: goal.milestones,
      success_criteria: goal.successCriteria,
      deadline: goal.deadline,
      agent_id: goal.agentId,
      tags: goal.tags,
      metadata: goal.metadata,
    });
    return response.data;
  }

  /**
   * Gets all active goals for a namespace
   *
   * @param namespace - The namespace to query
   * @param options - Optional query parameters
   * @returns Array of active goals
   *
   * @example
   * ```typescript
   * const activeGoals = await goals.getActive('project-alpha', {
   *   type: 'achievement',
   *   minPriority: 5
   * });
   * ```
   */
  async getActive(
    namespace: string,
    options?: { type?: string; minPriority?: number; agentId?: string }
  ): Promise<Goal[]> {
    const response = await this.client.get<{ goals: Goal[] }>('/', {
      params: {
        namespace,
        status: 'active',
        type: options?.type,
        min_priority: options?.minPriority,
        agent_id: options?.agentId,
      },
    });
    return response.data.goals;
  }

  /**
   * Gets a specific goal by ID
   *
   * @param goalId - The goal ID
   * @returns The goal with full details
   *
   * @example
   * ```typescript
   * const goal = await goals.get('goal-123');
   * console.log(`Progress: ${goal.progress}%`);
   * console.log(`Milestones: ${goal.milestones.filter(m => m.completed).length}/${goal.milestones.length}`);
   * ```
   */
  async get(goalId: string): Promise<Goal> {
    const response = await this.client.get<Goal>(`/${goalId}`);
    return response.data;
  }

  /**
   * Advances progress on a goal
   *
   * @param goalId - The goal ID
   * @param result - The result of work done toward the goal
   * @returns The advance result with updated goal state
   *
   * @example
   * ```typescript
   * const result = await goals.advance('goal-123', {
   *   action: 'Completed OAuth provider integration',
   *   milestoneId: 'milestone-2',
   *   progressDelta: 20,
   *   evidence: { commitHash: 'abc123', testsPass: true }
   * });
   *
   * if (result.goalCompleted) {
   *   console.log('Goal completed!');
   * }
   * ```
   */
  async advance(
    goalId: string,
    result: {
      action: string;
      milestoneId?: string;
      progressDelta?: number;
      evidence?: Record<string, unknown>;
    }
  ): Promise<AdvanceResult> {
    const response = await this.client.post<AdvanceResult>(`/${goalId}/advance`, {
      action: result.action,
      milestone_id: result.milestoneId,
      progress_delta: result.progressDelta,
      evidence: result.evidence,
    });
    return response.data;
  }

  /**
   * Marks a goal as completed
   *
   * @param goalId - The goal ID
   * @param summary - Optional completion summary
   * @returns The completed goal
   *
   * @example
   * ```typescript
   * const completed = await goals.complete('goal-123', {
   *   outcome: 'success',
   *   summary: 'All milestones achieved, auth system deployed',
   *   lessonsLearned: ['OAuth flow is complex', 'Session management needs monitoring']
   * });
   * ```
   */
  async complete(
    goalId: string,
    summary?: {
      outcome: 'success' | 'partial' | 'abandoned';
      summary?: string;
      lessonsLearned?: string[];
    }
  ): Promise<Goal> {
    const response = await this.client.post<Goal>(`/${goalId}/complete`, summary);
    return response.data;
  }
}
