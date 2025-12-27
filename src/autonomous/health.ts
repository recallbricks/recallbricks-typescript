import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Health Types
// ============================================================================

/**
 * A stale memory that may need refreshing
 */
export interface StaleMemory {
  /** Memory ID */
  id: string;
  /** Memory content */
  content: string;
  /** Last accessed timestamp */
  lastAccessedAt: string;
  /** Last verified timestamp */
  lastVerifiedAt?: string;
  /** Days since last access */
  daysSinceAccess: number;
  /** Staleness score (0-1, higher = more stale) */
  stalenessScore: number;
  /** Estimated importance */
  importance: number;
  /** Recommendation */
  recommendation: 'refresh' | 'archive' | 'delete' | 'keep';
  /** Reason for recommendation */
  reason: string;
  /** Memory type */
  memoryType?: string;
  /** Tags */
  tags?: string[];
}

/**
 * Result of refreshing a memory
 */
export interface RefreshResult {
  /** Memory ID */
  memoryId: string;
  /** Whether refresh was successful */
  success: boolean;
  /** New staleness score */
  newStalenessScore: number;
  /** New verification timestamp */
  verifiedAt: string;
  /** Who/what verified it */
  verifiedBy: string;
  /** Any updates made during refresh */
  updates?: {
    contentUpdated: boolean;
    metadataUpdated: boolean;
    tagsUpdated: boolean;
  };
}

/**
 * Health metrics for a namespace
 */
export interface HealthMetrics {
  /** Total memories in namespace */
  totalMemories: number;
  /** Active memories (accessed recently) */
  activeMemories: number;
  /** Stale memories */
  staleMemories: number;
  /** Verified memories */
  verifiedMemories: number;
  /** Average staleness score */
  averageStalenessScore: number;
  /** Health score (0-100) */
  healthScore: number;
}

/**
 * Memory type distribution
 */
export interface TypeDistribution {
  /** Memory type */
  type: string;
  /** Count of this type */
  count: number;
  /** Percentage of total */
  percentage: number;
  /** Average health score for this type */
  averageHealth: number;
}

/**
 * Recommendations for improving memory health
 */
export interface HealthRecommendation {
  /** Recommendation type */
  type: 'refresh' | 'archive' | 'consolidate' | 'delete' | 'verify';
  /** Priority (1-10) */
  priority: number;
  /** Description */
  description: string;
  /** Affected memory IDs */
  affectedMemoryIds: string[];
  /** Expected impact */
  expectedImpact: string;
}

/**
 * Full health report for a namespace
 */
export interface HealthReport {
  /** Namespace */
  namespace: string;
  /** Report generation timestamp */
  generatedAt: string;
  /** Overall health metrics */
  metrics: HealthMetrics;
  /** Distribution by memory type */
  typeDistribution: TypeDistribution[];
  /** Stale memories requiring attention */
  staleMemories: StaleMemory[];
  /** Recommendations */
  recommendations: HealthRecommendation[];
  /** Trend compared to previous period */
  trend: {
    healthScoreChange: number;
    direction: 'improving' | 'stable' | 'declining';
  };
}

/**
 * Client for memory health operations
 *
 * The health client helps maintain memory quality by identifying stale
 * or outdated memories, tracking verification status, and providing
 * recommendations for memory maintenance.
 *
 * @example
 * ```typescript
 * const health = new HealthClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'http://localhost:10002'
 * });
 *
 * // Get stale memories
 * const stale = await health.getStale('my-namespace', 30);
 *
 * // Refresh a memory
 * await health.refresh('mem-123', 'manual-verification');
 *
 * // Get full health report
 * const report = await health.getReport('my-namespace');
 * ```
 */
export class HealthClient {
  private readonly client: AxiosInstance;

  /**
   * Creates a new HealthClient instance
   *
   * @param config - Client configuration
   */
  constructor(config: { apiKey: string; baseUrl: string }) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/autonomous/health`,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Gets stale memories that haven't been accessed recently
   *
   * @param namespace - The namespace to check
   * @param threshold - Days threshold for considering a memory stale
   * @param options - Additional options
   * @returns Array of stale memories with recommendations
   *
   * @example
   * ```typescript
   * const stale = await health.getStale('knowledge-base', 30, {
   *   minImportance: 0.5,
   *   limit: 100
   * });
   *
   * const toRefresh = stale.filter(m => m.recommendation === 'refresh');
   * const toArchive = stale.filter(m => m.recommendation === 'archive');
   * ```
   */
  async getStale(
    namespace: string,
    threshold: number,
    options?: { minImportance?: number; memoryType?: string; limit?: number }
  ): Promise<StaleMemory[]> {
    const response = await this.client.get<{ memories: StaleMemory[] }>('/stale', {
      params: {
        namespace,
        threshold_days: threshold,
        min_importance: options?.minImportance,
        memory_type: options?.memoryType,
        limit: options?.limit,
      },
    });
    return response.data.memories;
  }

  /**
   * Refreshes a memory, updating its verification status
   *
   * @param memoryId - The memory ID to refresh
   * @param verifiedBy - Who/what verified the memory
   * @param updates - Optional updates to apply during refresh
   * @returns The refresh result
   *
   * @example
   * ```typescript
   * const result = await health.refresh('mem-123', 'agent-verification', {
   *   content: 'Updated content with new information',
   *   tags: ['verified', 'updated']
   * });
   *
   * console.log(`New staleness score: ${result.newStalenessScore}`);
   * ```
   */
  async refresh(
    memoryId: string,
    verifiedBy: string,
    updates?: { content?: string; metadata?: Record<string, unknown>; tags?: string[] }
  ): Promise<RefreshResult> {
    const response = await this.client.post<RefreshResult>(`/refresh/${memoryId}`, {
      verified_by: verifiedBy,
      content: updates?.content,
      metadata: updates?.metadata,
      tags: updates?.tags,
    });
    return response.data;
  }

  /**
   * Gets a comprehensive health report for a namespace
   *
   * @param namespace - The namespace to analyze
   * @param options - Report options
   * @returns Full health report with metrics and recommendations
   *
   * @example
   * ```typescript
   * const report = await health.getReport('production', {
   *   includeStaleMemories: true,
   *   staleThreshold: 14
   * });
   *
   * console.log(`Health Score: ${report.metrics.healthScore}/100`);
   * console.log(`Trend: ${report.trend.direction}`);
   *
   * report.recommendations.forEach(rec => {
   *   console.log(`[${rec.priority}] ${rec.description}`);
   * });
   * ```
   */
  async getReport(
    namespace: string,
    options?: {
      includeStaleMemories?: boolean;
      staleThreshold?: number;
      compareWithDays?: number;
    }
  ): Promise<HealthReport> {
    const response = await this.client.get<HealthReport>(`/report/${namespace}`, {
      params: {
        include_stale: options?.includeStaleMemories,
        stale_threshold: options?.staleThreshold,
        compare_days: options?.compareWithDays,
      },
    });
    return response.data;
  }
}
