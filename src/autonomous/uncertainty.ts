import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Uncertainty Types
// ============================================================================

/**
 * Source of uncertainty
 */
export interface UncertaintySource {
  /** Source type */
  type: 'data' | 'model' | 'knowledge' | 'context' | 'temporal';
  /** Description of the uncertainty source */
  description: string;
  /** Contribution to total uncertainty (0-1) */
  contribution: number;
  /** Whether this source can be reduced */
  reducible: boolean;
  /** How to reduce this uncertainty */
  reductionStrategy?: string;
}

/**
 * Configuration for uncertainty analysis
 */
export interface UncertaintyAnalysis {
  /** Agent ID */
  agentId: string;
  /** Content being analyzed */
  content: string;
  /** Type of content */
  contentType: 'response' | 'decision' | 'prediction' | 'retrieval';
  /** Self-reported confidence (0-1) */
  selfConfidence?: number;
  /** Known unknowns */
  knownUnknowns?: string[];
  /** Assumptions made */
  assumptions?: string[];
  /** Evidence supporting the content */
  evidence?: {
    source: string;
    strength: number;
    description: string;
  }[];
  /** Context of the analysis */
  context?: Record<string, unknown>;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of uncertainty quantification
 */
export interface UncertaintyResult {
  /** Analysis ID */
  id: string;
  /** Agent ID */
  agentId: string;
  /** Overall uncertainty score (0-1, higher = more uncertain) */
  uncertaintyScore: number;
  /** Confidence interval */
  confidenceInterval: {
    lower: number;
    upper: number;
    level: number; // e.g., 0.95 for 95% CI
  };
  /** Sources of uncertainty */
  sources: UncertaintySource[];
  /** Epistemic uncertainty (knowledge-based) */
  epistemicUncertainty: number;
  /** Aleatoric uncertainty (inherent randomness) */
  aleatoricUncertainty: number;
  /** Reliability assessment */
  reliability: 'high' | 'medium' | 'low' | 'very_low';
  /** Recommendations for reducing uncertainty */
  recommendations: string[];
  /** Whether action should be deferred due to uncertainty */
  deferAction: boolean;
  /** Suggested queries to reduce uncertainty */
  suggestedQueries?: string[];
  /** Analysis timestamp */
  analyzedAt: string;
}

/**
 * Historical uncertainty record
 */
export interface UncertaintyRecord {
  /** Record ID */
  id: string;
  /** Agent ID */
  agentId: string;
  /** Content type */
  contentType: string;
  /** Uncertainty score at time of analysis */
  uncertaintyScore: number;
  /** Self-reported confidence */
  selfConfidence?: number;
  /** Actual outcome (if known) */
  actualOutcome?: {
    correct: boolean;
    notes?: string;
  };
  /** Calibration (how accurate was confidence) */
  calibration?: number;
  /** Timestamp */
  timestamp: string;
}

/**
 * Uncertainty history summary
 */
export interface UncertaintyHistory {
  /** Agent ID */
  agentId: string;
  /** Total records */
  totalRecords: number;
  /** Average uncertainty */
  averageUncertainty: number;
  /** Average self-confidence */
  averageSelfConfidence: number;
  /** Calibration score (how well-calibrated is the agent) */
  calibrationScore: number;
  /** Uncertainty by content type */
  byContentType: Record<string, {
    count: number;
    averageUncertainty: number;
    averageConfidence: number;
  }>;
  /** Trend over time */
  trend: {
    direction: 'improving' | 'stable' | 'declining';
    changeRate: number;
  };
  /** Recent records */
  recentRecords: UncertaintyRecord[];
}

/**
 * Client for uncertainty quantification operations
 *
 * Uncertainty quantification helps agents understand and communicate
 * the reliability of their outputs. This is critical for autonomous
 * decision-making where knowing what you don't know is as important
 * as knowing what you do know.
 *
 * @example
 * ```typescript
 * const uncertainty = new UncertaintyClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'http://localhost:10002'
 * });
 *
 * // Quantify uncertainty for a response
 * const result = await uncertainty.quantify({
 *   agentId: 'agent-001',
 *   content: 'The project will be completed by Friday',
 *   contentType: 'prediction',
 *   selfConfidence: 0.7,
 *   assumptions: ['No scope changes', 'Team availability']
 * });
 *
 * if (result.deferAction) {
 *   console.log('Uncertainty too high, gathering more information...');
 * }
 * ```
 */
export class UncertaintyClient {
  private readonly client: AxiosInstance;

  /**
   * Creates a new UncertaintyClient instance
   *
   * @param config - Client configuration
   */
  constructor(config: { apiKey: string; baseUrl: string }) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/autonomous/uncertainty`,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Quantifies uncertainty for agent output
   *
   * @param analysis - The uncertainty analysis configuration
   * @returns Detailed uncertainty quantification result
   *
   * @example
   * ```typescript
   * const result = await uncertainty.quantify({
   *   agentId: 'agent-001',
   *   content: 'Based on historical data, sales will increase 15% next quarter',
   *   contentType: 'prediction',
   *   selfConfidence: 0.75,
   *   knownUnknowns: ['Market conditions', 'Competitor actions'],
   *   assumptions: ['Economic stability', 'No major disruptions'],
   *   evidence: [
   *     { source: 'historical-data', strength: 0.8, description: '3 years of sales data' },
   *     { source: 'market-analysis', strength: 0.6, description: 'Industry reports' }
   *   ]
   * });
   *
   * console.log(`Uncertainty: ${result.uncertaintyScore}`);
   * console.log(`Reliability: ${result.reliability}`);
   * console.log(`Epistemic: ${result.epistemicUncertainty}`);
   * console.log(`Aleatoric: ${result.aleatoricUncertainty}`);
   * ```
   */
  async quantify(analysis: UncertaintyAnalysis): Promise<UncertaintyResult> {
    const response = await this.client.post<UncertaintyResult>('/quantify', {
      agent_id: analysis.agentId,
      content: analysis.content,
      content_type: analysis.contentType,
      self_confidence: analysis.selfConfidence,
      known_unknowns: analysis.knownUnknowns,
      assumptions: analysis.assumptions,
      evidence: analysis.evidence,
      context: analysis.context,
      metadata: analysis.metadata,
    });
    return response.data;
  }

  /**
   * Gets uncertainty history for an agent
   *
   * @param agentId - The agent ID
   * @param options - Query options
   * @returns Uncertainty history with calibration metrics
   *
   * @example
   * ```typescript
   * const history = await uncertainty.getHistory('agent-001', {
   *   days: 30,
   *   contentType: 'prediction'
   * });
   *
   * console.log(`Calibration score: ${history.calibrationScore}`);
   * console.log(`Trend: ${history.trend.direction}`);
   *
   * // Check if agent is overconfident or underconfident
   * if (history.averageSelfConfidence > (1 - history.averageUncertainty) + 0.1) {
   *   console.log('Agent may be overconfident');
   * }
   * ```
   */
  async getHistory(
    agentId: string,
    options?: { days?: number; contentType?: string; limit?: number }
  ): Promise<UncertaintyHistory> {
    const response = await this.client.get<UncertaintyHistory>(`/history/${agentId}`, {
      params: {
        days: options?.days,
        content_type: options?.contentType,
        limit: options?.limit,
      },
    });
    return response.data;
  }
}
