import nock from 'nock';
import { RecallBricks, RecallBricksError, Memory } from '../src';

describe('RecallBricks Methods', () => {
  const baseUrl = 'http://localhost:10002/api/v1';
  const apiKey = 'test-api-key';
  let client: RecallBricks;

  beforeEach(() => {
    client = new RecallBricks({ apiKey, baseUrl, maxRetries: 0 });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('createMemory', () => {
    it('should create a memory with text only', async () => {
      const memory: Memory = {
        id: 'mem-123',
        text: 'Test memory',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      nock(baseUrl)
        .post('/memories', { text: 'Test memory' })
        .reply(200, memory);

      const result = await client.createMemory('Test memory');
      expect(result).toEqual(memory);
    });

    it('should create a memory with metadata', async () => {
      const memory: Memory = {
        id: 'mem-123',
        text: 'Test memory',
        metadata: { userId: '456' },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      nock(baseUrl)
        .post('/memories', {
          text: 'Test memory',
          metadata: { userId: '456' },
        })
        .reply(200, memory);

      const result = await client.createMemory('Test memory', {
        metadata: { userId: '456' },
      });
      expect(result).toEqual(memory);
    });

    it('should create a memory with tags', async () => {
      const memory: Memory = {
        id: 'mem-123',
        text: 'Test memory',
        tags: ['important', 'work'],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      nock(baseUrl)
        .post('/memories', {
          text: 'Test memory',
          tags: ['important', 'work'],
        })
        .reply(200, memory);

      const result = await client.createMemory('Test memory', {
        tags: ['important', 'work'],
      });
      expect(result).toEqual(memory);
    });

    it('should create a memory with timestamp', async () => {
      const timestamp = '2025-01-01T12:00:00Z';
      const memory: Memory = {
        id: 'mem-123',
        text: 'Test memory',
        created_at: timestamp,
        updated_at: timestamp,
      };

      nock(baseUrl)
        .post('/memories', { text: 'Test memory', timestamp })
        .reply(200, memory);

      const result = await client.createMemory('Test memory', { timestamp });
      expect(result).toEqual(memory);
    });

    it('should throw error for empty text', async () => {
      await expect(client.createMemory('')).rejects.toThrow(RecallBricksError);
      await expect(client.createMemory('   ')).rejects.toThrow('Text is required');
    });
  });

  describe('listMemories', () => {
    it('should list memories without options', async () => {
      const response = {
        memories: [
          { id: '1', text: 'Memory 1', created_at: '2025-01-01', updated_at: '2025-01-01' },
          { id: '2', text: 'Memory 2', created_at: '2025-01-02', updated_at: '2025-01-02' },
        ],
        total: 2,
        limit: 10,
        offset: 0,
      };

      nock(baseUrl)
        .get('/memories')
        .reply(200, response);

      const result = await client.listMemories();
      expect(result).toEqual(response);
      expect(result.memories).toHaveLength(2);
    });

    it('should list memories with limit and offset', async () => {
      const response = {
        memories: [{ id: '1', text: 'Memory 1', created_at: '2025-01-01', updated_at: '2025-01-01' }],
        total: 100,
        limit: 1,
        offset: 10,
      };

      nock(baseUrl)
        .get('/memories')
        .query({ limit: 1, offset: 10 })
        .reply(200, response);

      const result = await client.listMemories({ limit: 1, offset: 10 });
      expect(result).toEqual(response);
    });

    it('should list memories with tags filter', async () => {
      const response = {
        memories: [{ id: '1', text: 'Memory 1', tags: ['important'], created_at: '2025-01-01', updated_at: '2025-01-01' }],
        total: 1,
        limit: 10,
        offset: 0,
      };

      nock(baseUrl)
        .get('/memories')
        .query({ tags: 'important,work' })
        .reply(200, response);

      const result = await client.listMemories({ tags: ['important', 'work'] });
      expect(result).toEqual(response);
    });

    it('should list memories with sort options', async () => {
      const response = {
        memories: [],
        total: 0,
        limit: 10,
        offset: 0,
      };

      nock(baseUrl)
        .get('/memories')
        .query({ sort: 'asc', sortBy: 'created_at' })
        .reply(200, response);

      const result = await client.listMemories({ sort: 'asc', sortBy: 'created_at' });
      expect(result).toEqual(response);
    });

    it('should list memories with metadata filter', async () => {
      const response = {
        memories: [],
        total: 0,
        limit: 10,
        offset: 0,
      };

      nock(baseUrl)
        .get('/memories')
        .query({ metadata: JSON.stringify({ userId: '123' }) })
        .reply(200, response);

      const result = await client.listMemories({ metadata: { userId: '123' } });
      expect(result).toEqual(response);
    });
  });

  describe('search', () => {
    it('should search memories with query only', async () => {
      const response = {
        query: 'test query',
        results: [
          {
            memory: { id: '1', text: 'Result 1', created_at: '2025-01-01', updated_at: '2025-01-01' },
            score: 0.95,
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/search', { query: 'test query' })
        .reply(200, response);

      const result = await client.search('test query');
      expect(result).toEqual(response);
      expect(result.results).toHaveLength(1);
    });

    it('should search memories with limit', async () => {
      const response = {
        query: 'test query',
        results: [],
      };

      nock(baseUrl)
        .post('/memories/search', { query: 'test query', limit: 5 })
        .reply(200, response);

      const result = await client.search('test query', { limit: 5 });
      expect(result).toEqual(response);
    });

    it('should search memories with threshold', async () => {
      const response = {
        query: 'test query',
        results: [],
      };

      nock(baseUrl)
        .post('/memories/search', { query: 'test query', threshold: 0.8 })
        .reply(200, response);

      const result = await client.search('test query', { threshold: 0.8 });
      expect(result).toEqual(response);
    });

    it('should search memories with tags filter', async () => {
      const response = {
        query: 'test query',
        results: [],
      };

      nock(baseUrl)
        .post('/memories/search', {
          query: 'test query',
          tags: ['important'],
        })
        .reply(200, response);

      const result = await client.search('test query', { tags: ['important'] });
      expect(result).toEqual(response);
    });

    it('should throw error for empty query', async () => {
      await expect(client.search('')).rejects.toThrow(RecallBricksError);
      await expect(client.search('   ')).rejects.toThrow('Query is required');
    });
  });

  describe('getRelationships', () => {
    it('should get relationships for a memory', async () => {
      const response = {
        memory_id: 'mem-123',
        outgoing: [
          {
            source_id: 'mem-123',
            target_id: 'mem-456',
            type: 'related',
            strength: 0.8,
          },
        ],
        incoming: [
          {
            source_id: 'mem-789',
            target_id: 'mem-123',
            type: 'related',
            strength: 0.9,
          },
        ],
      };

      nock(baseUrl)
        .get('/memories/mem-123/relationships')
        .reply(200, response);

      const result = await client.getRelationships('mem-123');
      expect(result).toEqual(response);
      expect(result.outgoing).toHaveLength(1);
      expect(result.incoming).toHaveLength(1);
    });

    it('should throw error for empty memory ID', async () => {
      await expect(client.getRelationships('')).rejects.toThrow(RecallBricksError);
      await expect(client.getRelationships('   ')).rejects.toThrow('Memory ID is required');
    });
  });

  describe('getGraphContext', () => {
    it('should get graph context with default depth', async () => {
      const response = {
        root_id: 'mem-123',
        depth: 2,
        nodes: [
          {
            memory: { id: 'mem-123', text: 'Root', created_at: '2025-01-01', updated_at: '2025-01-01' },
            depth: 0,
            relationships: [],
          },
        ],
        total_nodes: 1,
      };

      nock(baseUrl)
        .get('/memories/mem-123/graph')
        .query({ depth: 2 })
        .reply(200, response);

      const result = await client.getGraphContext('mem-123');
      expect(result).toEqual(response);
    });

    it('should get graph context with custom depth', async () => {
      const response = {
        root_id: 'mem-123',
        depth: 5,
        nodes: [],
        total_nodes: 0,
      };

      nock(baseUrl)
        .get('/memories/mem-123/graph')
        .query({ depth: 5 })
        .reply(200, response);

      const result = await client.getGraphContext('mem-123', 5);
      expect(result).toEqual(response);
    });

    it('should throw error for empty memory ID', async () => {
      await expect(client.getGraphContext('')).rejects.toThrow(RecallBricksError);
      await expect(client.getGraphContext('   ')).rejects.toThrow('Memory ID is required');
    });

    it('should throw error for invalid depth', async () => {
      await expect(client.getGraphContext('mem-123', 0)).rejects.toThrow('Depth must be between 1 and 10');
      await expect(client.getGraphContext('mem-123', 11)).rejects.toThrow('Depth must be between 1 and 10');
    });
  });

  describe('deleteMemory', () => {
    it('should delete a memory', async () => {
      nock(baseUrl)
        .delete('/memories/mem-123')
        .reply(204);

      const result = await client.deleteMemory('mem-123');
      expect(result).toBe(true);
    });

    it('should throw error for empty memory ID', async () => {
      await expect(client.deleteMemory('')).rejects.toThrow(RecallBricksError);
      await expect(client.deleteMemory('   ')).rejects.toThrow('Memory ID is required');
    });
  });

  describe('updateMemory', () => {
    it('should update memory text', async () => {
      const updated: Memory = {
        id: 'mem-123',
        text: 'Updated text',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      nock(baseUrl)
        .patch('/memories/mem-123', { text: 'Updated text' })
        .reply(200, updated);

      const result = await client.updateMemory('mem-123', { text: 'Updated text' });
      expect(result).toEqual(updated);
    });

    it('should update memory metadata', async () => {
      const updated: Memory = {
        id: 'mem-123',
        text: 'Original text',
        metadata: { version: 2 },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      nock(baseUrl)
        .patch('/memories/mem-123', { metadata: { version: 2 } })
        .reply(200, updated);

      const result = await client.updateMemory('mem-123', { metadata: { version: 2 } });
      expect(result).toEqual(updated);
    });

    it('should update memory tags', async () => {
      const updated: Memory = {
        id: 'mem-123',
        text: 'Original text',
        tags: ['updated', 'important'],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      nock(baseUrl)
        .patch('/memories/mem-123', { tags: ['updated', 'important'] })
        .reply(200, updated);

      const result = await client.updateMemory('mem-123', { tags: ['updated', 'important'] });
      expect(result).toEqual(updated);
    });

    it('should update multiple fields', async () => {
      const updated: Memory = {
        id: 'mem-123',
        text: 'Updated text',
        tags: ['updated'],
        metadata: { version: 2 },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      nock(baseUrl)
        .patch('/memories/mem-123', {
          text: 'Updated text',
          tags: ['updated'],
          metadata: { version: 2 },
        })
        .reply(200, updated);

      const result = await client.updateMemory('mem-123', {
        text: 'Updated text',
        tags: ['updated'],
        metadata: { version: 2 },
      });
      expect(result).toEqual(updated);
    });

    it('should throw error for empty memory ID', async () => {
      await expect(client.updateMemory('', { text: 'Updated' })).rejects.toThrow(RecallBricksError);
      await expect(client.updateMemory('   ', { text: 'Updated' })).rejects.toThrow('Memory ID is required');
    });

    it('should throw error for empty updates', async () => {
      await expect(client.updateMemory('mem-123', {})).rejects.toThrow('Updates are required');
    });

    it('should throw error for empty text', async () => {
      await expect(client.updateMemory('mem-123', { text: '' })).rejects.toThrow('Text cannot be empty');
      await expect(client.updateMemory('mem-123', { text: '   ' })).rejects.toThrow('Text cannot be empty');
    });
  });

  // ============================================================================
  // Phase 2A: Metacognition Features Tests
  // ============================================================================

  describe('predictMemories', () => {
    it('should predict memories without options', async () => {
      const response = {
        predictions: [
          {
            id: 'mem-123',
            content: 'Predicted memory',
            confidence_score: 0.85,
            reasoning: 'Based on recent usage patterns',
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/predict', {})
        .reply(200, response);

      const result = await client.predictMemories();
      expect(result).toEqual(response);
      expect(result.predictions).toHaveLength(1);
    });

    it('should predict memories with context', async () => {
      const response = {
        predictions: [
          {
            id: 'mem-123',
            content: 'Predicted memory',
            confidence_score: 0.85,
            reasoning: 'Based on authentication context',
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/predict', { context: 'working on authentication' })
        .reply(200, response);

      const result = await client.predictMemories({ context: 'working on authentication' });
      expect(result).toEqual(response);
    });

    it('should predict memories with recent memory IDs', async () => {
      const response = {
        predictions: [
          {
            id: 'mem-456',
            content: 'Related memory',
            confidence_score: 0.92,
            reasoning: 'Frequently accessed with provided memories',
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/predict', { recent_memory_ids: ['mem-123', 'mem-789'] })
        .reply(200, response);

      const result = await client.predictMemories({ recentMemoryIds: ['mem-123', 'mem-789'] });
      expect(result).toEqual(response);
    });

    it('should predict memories with limit', async () => {
      const response = {
        predictions: [],
      };

      nock(baseUrl)
        .post('/memories/predict', { limit: 5 })
        .reply(200, response);

      const result = await client.predictMemories({ limit: 5 });
      expect(result).toEqual(response);
    });

    it('should predict memories with all options', async () => {
      const response = {
        predictions: [],
      };

      nock(baseUrl)
        .post('/memories/predict', {
          context: 'authentication',
          recent_memory_ids: ['mem-1'],
          limit: 3,
        })
        .reply(200, response);

      const result = await client.predictMemories({
        context: 'authentication',
        recentMemoryIds: ['mem-1'],
        limit: 3,
      });
      expect(result).toEqual(response);
    });
  });

  describe('suggestMemories', () => {
    it('should suggest memories with context only', async () => {
      const response = {
        suggestions: [
          {
            id: 'mem-123',
            content: 'Suggested memory',
            confidence: 0.88,
            reasoning: 'Relevant to user authentication',
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/suggest', { context: 'user authentication flow' })
        .reply(200, response);

      const result = await client.suggestMemories('user authentication flow');
      expect(result).toEqual(response);
      expect(result.suggestions).toHaveLength(1);
    });

    it('should suggest memories with limit', async () => {
      const response = {
        suggestions: [],
      };

      nock(baseUrl)
        .post('/memories/suggest', { context: 'test context', limit: 10 })
        .reply(200, response);

      const result = await client.suggestMemories('test context', { limit: 10 });
      expect(result).toEqual(response);
    });

    it('should suggest memories with minConfidence', async () => {
      const response = {
        suggestions: [],
      };

      nock(baseUrl)
        .post('/memories/suggest', { context: 'test context', min_confidence: 0.7 })
        .reply(200, response);

      const result = await client.suggestMemories('test context', { minConfidence: 0.7 });
      expect(result).toEqual(response);
    });

    it('should suggest memories with includeReasoning', async () => {
      const response = {
        suggestions: [
          {
            id: 'mem-123',
            content: 'Suggested memory',
            confidence: 0.88,
            reasoning: 'Detailed reasoning here',
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/suggest', { context: 'test context', include_reasoning: true })
        .reply(200, response);

      const result = await client.suggestMemories('test context', { includeReasoning: true });
      expect(result).toEqual(response);
    });

    it('should suggest memories with all options', async () => {
      const response = {
        suggestions: [],
      };

      nock(baseUrl)
        .post('/memories/suggest', {
          context: 'authentication',
          limit: 5,
          min_confidence: 0.8,
          include_reasoning: true,
        })
        .reply(200, response);

      const result = await client.suggestMemories('authentication', {
        limit: 5,
        minConfidence: 0.8,
        includeReasoning: true,
      });
      expect(result).toEqual(response);
    });

    it('should throw error for empty context', async () => {
      await expect(client.suggestMemories('')).rejects.toThrow(RecallBricksError);
      await expect(client.suggestMemories('   ')).rejects.toThrow('Context is required');
    });
  });

  describe('getLearningMetrics', () => {
    it('should get learning metrics with default days', async () => {
      const response = {
        avg_helpfulness: 0.75,
        total_usage: 1250,
        active_memories: 450,
        trends: {
          helpfulness_trend: 'improving' as const,
          usage_trend: 'increasing' as const,
          active_memories_trend: 'growing' as const,
        },
      };

      nock(baseUrl)
        .get('/analytics/learning-metrics')
        .query({ days: 30 })
        .reply(200, response);

      const result = await client.getLearningMetrics();
      expect(result).toEqual(response);
      expect(result.avg_helpfulness).toBe(0.75);
      expect(result.total_usage).toBe(1250);
      expect(result.active_memories).toBe(450);
    });

    it('should get learning metrics with custom days', async () => {
      const response = {
        avg_helpfulness: 0.82,
        total_usage: 350,
        active_memories: 150,
        trends: {
          helpfulness_trend: 'stable' as const,
          usage_trend: 'increasing' as const,
          active_memories_trend: 'growing' as const,
        },
      };

      nock(baseUrl)
        .get('/analytics/learning-metrics')
        .query({ days: 7 })
        .reply(200, response);

      const result = await client.getLearningMetrics(7);
      expect(result).toEqual(response);
    });

    it('should get learning metrics without trends', async () => {
      const response = {
        avg_helpfulness: 0.68,
        total_usage: 500,
        active_memories: 200,
      };

      nock(baseUrl)
        .get('/analytics/learning-metrics')
        .query({ days: 1 })
        .reply(200, response);

      const result = await client.getLearningMetrics(1);
      expect(result).toEqual(response);
    });

    it('should throw error for invalid days', async () => {
      await expect(client.getLearningMetrics(0)).rejects.toThrow('Days must be at least 1');
      await expect(client.getLearningMetrics(-5)).rejects.toThrow('Days must be at least 1');
    });
  });

  describe('getPatterns', () => {
    it('should get patterns with default days', async () => {
      const response = {
        frequently_accessed: [
          {
            memory_id: 'mem-123',
            access_count: 45,
            last_accessed: '2025-01-15T10:30:00Z',
          },
        ],
        co_access_patterns: [
          {
            memory_ids: ['mem-123', 'mem-456'],
            frequency: 12,
            strength: 0.85,
          },
        ],
        temporal_patterns: [
          {
            time_period: 'morning',
            memory_ids: ['mem-789'],
            frequency: 8,
          },
        ],
      };

      nock(baseUrl)
        .get('/analytics/patterns')
        .query({ days: 30 })
        .reply(200, response);

      const result = await client.getPatterns();
      expect(result).toEqual(response);
      expect(result.frequently_accessed).toHaveLength(1);
      expect(result.co_access_patterns).toHaveLength(1);
      expect(result.temporal_patterns).toHaveLength(1);
    });

    it('should get patterns with custom days', async () => {
      const response = {
        frequently_accessed: [],
        co_access_patterns: [],
        temporal_patterns: [],
      };

      nock(baseUrl)
        .get('/analytics/patterns')
        .query({ days: 14 })
        .reply(200, response);

      const result = await client.getPatterns(14);
      expect(result).toEqual(response);
    });

    it('should throw error for invalid days', async () => {
      await expect(client.getPatterns(0)).rejects.toThrow('Days must be at least 1');
      await expect(client.getPatterns(-3)).rejects.toThrow('Days must be at least 1');
    });
  });

  describe('searchWeighted', () => {
    it('should search weighted with query only', async () => {
      const response = {
        query: 'authentication logic',
        results: [
          {
            id: 'mem-123',
            text: 'Authentication implementation',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            relevance_score: 0.92,
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/search-weighted', { query: 'authentication logic' })
        .reply(200, response);

      const result = await client.searchWeighted('authentication logic');
      expect(result).toEqual(response);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].relevance_score).toBe(0.92);
    });

    it('should search weighted with limit', async () => {
      const response = {
        query: 'test query',
        results: [],
      };

      nock(baseUrl)
        .post('/memories/search-weighted', { query: 'test query', limit: 10 })
        .reply(200, response);

      const result = await client.searchWeighted('test query', { limit: 10 });
      expect(result).toEqual(response);
    });

    it('should search weighted with weightByUsage', async () => {
      const response = {
        query: 'test query',
        results: [],
      };

      nock(baseUrl)
        .post('/memories/search-weighted', { query: 'test query', weight_by_usage: true })
        .reply(200, response);

      const result = await client.searchWeighted('test query', { weightByUsage: true });
      expect(result).toEqual(response);
    });

    it('should search weighted with decayOldMemories', async () => {
      const response = {
        query: 'test query',
        results: [],
      };

      nock(baseUrl)
        .post('/memories/search-weighted', { query: 'test query', decay_old_memories: true })
        .reply(200, response);

      const result = await client.searchWeighted('test query', { decayOldMemories: true });
      expect(result).toEqual(response);
    });

    it('should search weighted with adaptiveWeights', async () => {
      const response = {
        query: 'test query',
        results: [],
      };

      nock(baseUrl)
        .post('/memories/search-weighted', { query: 'test query', adaptive_weights: true })
        .reply(200, response);

      const result = await client.searchWeighted('test query', { adaptiveWeights: true });
      expect(result).toEqual(response);
    });

    it('should search weighted with minHelpfulnessScore', async () => {
      const response = {
        query: 'test query',
        results: [],
      };

      nock(baseUrl)
        .post('/memories/search-weighted', { query: 'test query', min_helpfulness_score: 0.5 })
        .reply(200, response);

      const result = await client.searchWeighted('test query', { minHelpfulnessScore: 0.5 });
      expect(result).toEqual(response);
    });

    it('should search weighted with all options', async () => {
      const response = {
        query: 'authentication',
        results: [
          {
            id: 'mem-123',
            text: 'Auth logic',
            tags: ['security'],
            metadata: { type: 'implementation' },
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            relevance_score: 0.95,
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/search-weighted', {
          query: 'authentication',
          limit: 5,
          weight_by_usage: true,
          decay_old_memories: true,
          adaptive_weights: true,
          min_helpfulness_score: 0.6,
        })
        .reply(200, response);

      const result = await client.searchWeighted('authentication', {
        limit: 5,
        weightByUsage: true,
        decayOldMemories: true,
        adaptiveWeights: true,
        minHelpfulnessScore: 0.6,
      });
      expect(result).toEqual(response);
    });

    it('should throw error for empty query', async () => {
      await expect(client.searchWeighted('')).rejects.toThrow(RecallBricksError);
      await expect(client.searchWeighted('   ')).rejects.toThrow('Query is required');
    });
  });
});
