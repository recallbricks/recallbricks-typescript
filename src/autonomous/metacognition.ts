import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Metacognition Types
// ============================================================================

/**
 * Quality assessment request
 */
export interface QualityAssessment {
  /** Agent ID */
  agentId: string;
  /** The task or response being assessed */
  content: string;
  /** Type of content being assessed */
  contentType: 'response' | 'decision' | 'retrieval' | 'reasoning';
  /** Self-assessed quality score (0-1) */
  selfScore?: number;
  /** Confidence in the self-assessment */
  confidence?: number;
  /** Reasoning for the assessment */
  reasoning?: string;
  /** Ground truth or external feedback if available */
  groundTruth?: {
    score: number;
    source: string;
    feedback?: string;
  };
  /** Context of the task */
  context?: Record<string, unknown>;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a quality assessment
 */
export interface AssessmentResult {
  /** Assessment ID */
  id: string;
  /** Agent ID */
  agentId: string;
  /** Final quality score */
  qualityScore: number;
  /** Confidence in the assessment */
  confidence: number;
  /** Calibration score (how accurate is self-assessment) */
  calibrationScore?: number;
  /** Areas of strength identified */
  strengths: string[];
  /** Areas for improvement */
  improvements: string[];
  /** Recommended actions */
  recommendations: string[];
  /** Assessment timestamp */
  assessedAt: string;
}

/**
 * Agent performance metrics
 */
export interface PerformanceMetrics {
  /** Agent ID */
  agentId: string;
  /** Overall performance score */
  overallScore: number;
  /** Average quality across assessments */
  averageQuality: number;
  /** Calibration accuracy */
  calibrationAccuracy: number;
  /** Confidence correlation with actual performance */
  confidenceCorrelation: number;
  /** Performance by content type */
  byContentType: Record<string, {
    count: number;
    averageScore: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  /** Performance over time */
  timeline: {
    period: string;
    score: number;
    assessmentCount: number;
  }[];
  /** Total assessments */
  totalAssessments: number;
  /** Period covered */
  periodStart: string;
  periodEnd: string;
}

/**
 * An insight derived from metacognitive analysis
 */
export interface Insight {
  /** Insight ID */
  id: string;
  /** Type of insight */
  type: 'pattern' | 'anomaly' | 'recommendation' | 'trend';
  /** Insight title */
  title: string;
  /** Detailed description */
  description: string;
  /** Importance level (1-10) */
  importance: number;
  /** Confidence in the insight */
  confidence: number;
  /** Related assessment IDs */
  relatedAssessments: string[];
  /** Actionable recommendations */
  actions?: string[];
  /** When the insight was generated */
  generatedAt: string;
}

/**
 * Client for metacognition operations
 *
 * Metacognition enables agents to "think about thinking" - to assess
 * their own performance, identify areas for improvement, and calibrate
 * their confidence levels based on actual outcomes.
 *
 * @example
 * ```typescript
 * const metacognition = new MetacognitionClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'http://localhost:10002'
 * });
 *
 * // Assess quality of a response
 * const assessment = await metacognition.assess({
 *   agentId: 'agent-001',
 *   content: 'The capital of France is Paris',
 *   contentType: 'response',
 *   selfScore: 0.95,
 *   confidence: 0.9
 * });
 * ```
 */
export class MetacognitionClient {
  private readonly client: AxiosInstance;

  /**
   * Creates a new MetacognitionClient instance
   *
   * @param config - Client configuration
   */
  constructor(config: { apiKey: string; baseUrl: string }) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/autonomous/metacognition`,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Assesses the quality of agent output
   *
   * @param quality - The quality assessment data
   * @returns Assessment result with scores and recommendations
   *
   * @example
   * ```typescript
   * const result = await metacognition.assess({
   *   agentId: 'agent-001',
   *   content: 'Complex reasoning about user query...',
   *   contentType: 'reasoning',
   *   selfScore: 0.85,
   *   confidence: 0.7,
   *   reasoning: 'Used multiple sources but uncertain about edge cases'
   * });
   *
   * console.log(`Quality: ${result.qualityScore}`);
   * console.log(`Improvements: ${result.improvements.join(', ')}`);
   * ```
   */
  async assess(quality: QualityAssessment): Promise<AssessmentResult> {
    const response = await this.client.post<AssessmentResult>('/assess', {
      agent_id: quality.agentId,
      content: quality.content,
      content_type: quality.contentType,
      self_score: quality.selfScore,
      confidence: quality.confidence,
      reasoning: quality.reasoning,
      ground_truth: quality.groundTruth,
      context: quality.context,
      metadata: quality.metadata,
    });
    return response.data;
  }

  /**
   * Gets performance metrics for an agent
   *
   * @param agentId - The agent ID
   * @param options - Optional query parameters
   * @returns Performance metrics
   *
   * @example
   * ```typescript
   * const performance = await metacognition.getPerformance('agent-001', {
   *   days: 30,
   *   contentType: 'response'
   * });
   *
   * console.log(`Overall score: ${performance.overallScore}`);
   * console.log(`Calibration: ${performance.calibrationAccuracy}`);
   * ```
   */
  async getPerformance(
    agentId: string,
    options?: { days?: number; contentType?: string }
  ): Promise<PerformanceMetrics> {
    const response = await this.client.get<PerformanceMetrics>(`/performance/${agentId}`, {
      params: {
        days: options?.days,
        content_type: options?.contentType,
      },
    });
    return response.data;
  }

  /**
   * Gets insights derived from metacognitive analysis
   *
   * @param agentId - The agent ID
   * @param options - Optional query parameters
   * @returns Array of insights
   *
   * @example
   * ```typescript
   * const insights = await metacognition.getInsights('agent-001', {
   *   minImportance: 7,
   *   type: 'recommendation'
   * });
   *
   * insights.forEach(insight => {
   *   console.log(`[${insight.type}] ${insight.title}`);
   *   insight.actions?.forEach(action => console.log(`  - ${action}`));
   * });
   * ```
   */
  async getInsights(
    agentId: string,
    options?: { minImportance?: number; type?: string; limit?: number }
  ): Promise<Insight[]> {
    const response = await this.client.get<{ insights: Insight[] }>(`/insights/${agentId}`, {
      params: {
        min_importance: options?.minImportance,
        type: options?.type,
        limit: options?.limit,
      },
    });
    return response.data.insights;
  }
}
