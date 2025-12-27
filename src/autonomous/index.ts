/**
 * Autonomous Agent Features
 *
 * This module provides specialized memory and cognitive capabilities
 * for building autonomous AI agents with human-like memory systems.
 *
 * @module autonomous
 */

// Working Memory - Attention-based active memory
export {
  WorkingMemoryClient,
  WorkingMemorySessionConfig,
  WorkingMemorySession,
  AddMemoryOptions,
  WorkingMemoryItem,
  PromoteResult,
  AutoManageResult,
} from './working-memory';

// Prospective Memory - Remember to remember
export {
  ProspectiveMemoryClient,
  TriggerCondition,
  IntentionConfig,
  Intention,
  TriggerCheckResult,
} from './prospective-memory';

// Metacognition - Think about thinking
export {
  MetacognitionClient,
  QualityAssessment,
  AssessmentResult,
  PerformanceMetrics,
  Insight,
} from './metacognition';

// Memory Types - Episodic, Semantic, Procedural
export {
  MemoryTypesClient,
  EpisodicMemoryConfig,
  EpisodicMemory,
  EpisodicMemoryFilters,
  SemanticMemoryConfig,
  SemanticMemory,
  SemanticMemoryFilters,
  ProceduralMemoryConfig,
  ProceduralMemory,
  ProceduralMemoryFilters,
  ProcedureStep,
} from './memory-types';

// Goals - Hierarchical objective tracking
export {
  GoalsClient,
  GoalConfig,
  Goal,
  GoalMilestone,
  AdvanceResult,
} from './goals';

// Health - Memory maintenance and quality
export {
  HealthClient,
  StaleMemory,
  RefreshResult,
  HealthMetrics,
  TypeDistribution,
  HealthRecommendation,
  HealthReport,
} from './health';

// Uncertainty - Quantify and track uncertainty
export {
  UncertaintyClient,
  UncertaintySource,
  UncertaintyAnalysis,
  UncertaintyResult,
  UncertaintyRecord,
  UncertaintyHistory,
} from './uncertainty';

// Context - Intelligent context building
export {
  ContextClient,
  ContextSource,
  ContextBuildConfig,
  ContextItem,
  ContextGoal,
  ContextIntention,
  BuiltContext,
} from './context';

// Search - Hybrid search capabilities
export {
  SearchClient,
  HybridSearchOptions,
  HybridSearchResult,
  HybridSearchResponse,
} from './search';
