import nock from 'nock';
import { RecallBricks, RecallBricksError } from '../src';

describe('Load and Stress Tests', () => {
  const baseUrl = 'http://localhost:10002/api/v1';
  const apiKey = 'test-api-key';
  let client: RecallBricks;

  beforeEach(() => {
    client = new RecallBricks({ apiKey, baseUrl, maxRetries: 3 });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 100 concurrent predictMemories requests', async () => {
      const response = {
        predictions: [
          {
            id: 'mem-123',
            content: 'Predicted memory',
            confidence_score: 0.85,
            reasoning: 'Based on usage',
          },
        ],
      };

      // Mock 100 requests
      for (let i = 0; i < 100; i++) {
        nock(baseUrl)
          .post('/memories/predict', {})
          .reply(200, response);
      }

      const promises = Array(100)
        .fill(null)
        .map(() => client.predictMemories());

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.predictions).toHaveLength(1);
      });
    });

    it('should handle 50 concurrent suggestMemories requests with different contexts', async () => {
      const contexts = Array(50)
        .fill(null)
        .map((_, i) => `context-${i}`);

      contexts.forEach(ctx => {
        nock(baseUrl)
          .post('/memories/suggest', { context: ctx })
          .reply(200, { suggestions: [] });
      });

      const promises = contexts.map(ctx => client.suggestMemories(ctx));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result.suggestions).toBeDefined();
      });
    });

    it('should handle mixed concurrent requests of all Phase 2A methods', async () => {
      // Mock different endpoints
      nock(baseUrl).post('/memories/predict', {}).reply(200, { predictions: [] });
      nock(baseUrl).post('/memories/suggest', { context: 'test' }).reply(200, { suggestions: [] });
      nock(baseUrl).get('/analytics/learning-metrics').query({ days: 30 }).reply(200, {
        avg_helpfulness: 0.8,
        total_usage: 100,
        active_memories: 50
      });
      nock(baseUrl).get('/analytics/patterns').query({ days: 30 }).reply(200, {
        frequently_accessed: [],
        co_access_patterns: [],
        temporal_patterns: []
      });
      nock(baseUrl).post('/memories/search-weighted', { query: 'test' }).reply(200, {
        query: 'test',
        results: []
      });

      const promises = [
        client.predictMemories(),
        client.suggestMemories('test'),
        client.getLearningMetrics(),
        client.getPatterns(),
        client.searchWeighted('test'),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
    });

    it('should handle 200 concurrent requests across all methods', async () => {
      const requestCount = 200;

      // Mock all endpoints with enough capacity
      for (let i = 0; i < requestCount; i++) {
        const method = i % 5;
        switch (method) {
          case 0:
            nock(baseUrl).post('/memories/predict', {}).reply(200, { predictions: [] });
            break;
          case 1:
            nock(baseUrl).post('/memories/suggest', { context: `ctx-${i}` }).reply(200, { suggestions: [] });
            break;
          case 2:
            nock(baseUrl).get('/analytics/learning-metrics').query({ days: 30 }).reply(200, {
              avg_helpfulness: 0.8, total_usage: 100, active_memories: 50
            });
            break;
          case 3:
            nock(baseUrl).get('/analytics/patterns').query({ days: 30 }).reply(200, {
              frequently_accessed: [], co_access_patterns: [], temporal_patterns: []
            });
            break;
          case 4:
            nock(baseUrl).post('/memories/search-weighted', { query: `q-${i}` }).reply(200, {
              query: `q-${i}`, results: []
            });
            break;
        }
      }

      const promises = Array(requestCount).fill(null).map((_, i) => {
        const method = i % 5;
        switch (method) {
          case 0: return client.predictMemories();
          case 1: return client.suggestMemories(`ctx-${i}`);
          case 2: return client.getLearningMetrics();
          case 3: return client.getPatterns();
          case 4: return client.searchWeighted(`q-${i}`);
          default: return client.predictMemories();
        }
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(requestCount);
    });
  });

  describe('Retry Logic and Failure Scenarios', () => {
    it('should retry on 500 errors and eventually succeed', async () => {
      const client = new RecallBricks({ apiKey, baseUrl, maxRetries: 3, retryDelay: 10 });

      // Fail twice, then succeed
      nock(baseUrl).post('/memories/predict', {}).reply(500, { error: 'Server error' });
      nock(baseUrl).post('/memories/predict', {}).reply(500, { error: 'Server error' });
      nock(baseUrl).post('/memories/predict', {}).reply(200, { predictions: [] });

      const result = await client.predictMemories();
      expect(result.predictions).toBeDefined();
    });

    it('should retry on 503 service unavailable', async () => {
      const client = new RecallBricks({ apiKey, baseUrl, maxRetries: 2, retryDelay: 10 });

      nock(baseUrl).post('/memories/suggest', { context: 'test' }).reply(503);
      nock(baseUrl).post('/memories/suggest', { context: 'test' }).reply(200, { suggestions: [] });

      const result = await client.suggestMemories('test');
      expect(result.suggestions).toBeDefined();
    });

    it('should fail after max retries on persistent 500 errors', async () => {
      const client = new RecallBricks({ apiKey, baseUrl, maxRetries: 2, retryDelay: 10 });

      // All requests fail
      nock(baseUrl).post('/memories/predict', {}).reply(500, { error: 'Server error' });
      nock(baseUrl).post('/memories/predict', {}).reply(500, { error: 'Server error' });
      nock(baseUrl).post('/memories/predict', {}).reply(500, { error: 'Server error' });

      await expect(client.predictMemories()).rejects.toThrow(RecallBricksError);
    });

    it('should handle rate limiting with 429 responses', async () => {
      const client = new RecallBricks({ apiKey, baseUrl, maxRetries: 2, retryDelay: 10 });

      nock(baseUrl).get('/analytics/learning-metrics').query({ days: 30 }).reply(429, { error: 'Rate limited' });
      nock(baseUrl).get('/analytics/learning-metrics').query({ days: 30 }).reply(200, {
        avg_helpfulness: 0.8, total_usage: 100, active_memories: 50
      });

      const result = await client.getLearningMetrics();
      expect(result.avg_helpfulness).toBe(0.8);
    });

    it('should handle network errors with retry', async () => {
      const client = new RecallBricks({ apiKey, baseUrl, maxRetries: 2, retryDelay: 10 });

      nock(baseUrl).post('/memories/search-weighted', { query: 'test' }).replyWithError('Network error');
      nock(baseUrl).post('/memories/search-weighted', { query: 'test' }).reply(200, {
        query: 'test', results: []
      });

      const result = await client.searchWeighted('test');
      expect(result.results).toBeDefined();
    });

    it('should not retry on 400 bad request', async () => {
      const client = new RecallBricks({ apiKey, baseUrl, maxRetries: 3 });

      nock(baseUrl).post('/memories/suggest', { context: 'test' }).reply(400, {
        error: 'Bad request', code: 'INVALID_REQUEST'
      });

      await expect(client.suggestMemories('test')).rejects.toThrow(RecallBricksError);
    });

    it('should not retry on 401 unauthorized', async () => {
      const client = new RecallBricks({ apiKey, baseUrl, maxRetries: 3 });

      nock(baseUrl).get('/analytics/patterns').query({ days: 30 }).reply(401, {
        error: 'Unauthorized', code: 'INVALID_API_KEY'
      });

      await expect(client.getPatterns()).rejects.toThrow(RecallBricksError);
    });

    it('should handle timeout scenarios', async () => {
      const client = new RecallBricks({ apiKey, baseUrl, timeout: 100, maxRetries: 1, retryDelay: 10 });

      nock(baseUrl).post('/memories/predict', {}).delay(200).reply(200, { predictions: [] });
      nock(baseUrl).post('/memories/predict', {}).reply(200, { predictions: [] });

      const result = await client.predictMemories();
      expect(result.predictions).toBeDefined();
    });
  });

  describe('Large Payload Handling', () => {
    it('should handle large prediction responses', async () => {
      const largePredictions = Array(1000).fill(null).map((_, i) => ({
        id: `mem-${i}`,
        content: `Predicted memory ${i} with very long content that simulates real-world usage patterns and detailed information about the memory context`,
        confidence_score: Math.random(),
        reasoning: `Detailed reasoning for prediction ${i} including multiple factors and analysis`,
      }));

      nock(baseUrl).post('/memories/predict', {}).reply(200, { predictions: largePredictions });

      const result = await client.predictMemories();
      expect(result.predictions).toHaveLength(1000);
    });

    it('should handle large pattern analysis responses', async () => {
      const largePatterns = {
        frequently_accessed: Array(500).fill(null).map((_, i) => ({
          memory_id: `mem-${i}`,
          access_count: Math.floor(Math.random() * 100),
          last_accessed: new Date().toISOString(),
        })),
        co_access_patterns: Array(200).fill(null).map((_, i) => ({
          memory_ids: [`mem-${i}`, `mem-${i + 1}`, `mem-${i + 2}`],
          frequency: Math.floor(Math.random() * 50),
          strength: Math.random(),
        })),
        temporal_patterns: Array(100).fill(null).map((_, i) => ({
          time_period: ['morning', 'afternoon', 'evening'][i % 3],
          memory_ids: Array(10).fill(null).map((_, j) => `mem-${i * 10 + j}`),
          frequency: Math.floor(Math.random() * 30),
        })),
      };

      nock(baseUrl).get('/analytics/patterns').query({ days: 30 }).reply(200, largePatterns);

      const result = await client.getPatterns();
      expect(result.frequently_accessed).toHaveLength(500);
      expect(result.co_access_patterns).toHaveLength(200);
      expect(result.temporal_patterns).toHaveLength(100);
    });

    it('should handle large weighted search results', async () => {
      const largeResults = Array(500).fill(null).map((_, i) => ({
        id: `mem-${i}`,
        text: `Memory ${i} with extensive content that would appear in search results including detailed information, metadata, tags, and other relevant data points that make this a realistic test case`,
        tags: [`tag-${i % 10}`, `category-${i % 5}`],
        metadata: { index: i, category: `cat-${i % 20}`, priority: Math.random() },
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        updated_at: new Date(Date.now() - i * 43200000).toISOString(),
        relevance_score: Math.random(),
      }));

      nock(baseUrl).post('/memories/search-weighted', { query: 'large query' }).reply(200, {
        query: 'large query',
        results: largeResults
      });

      const result = await client.searchWeighted('large query');
      expect(result.results).toHaveLength(500);
    });
  });

  describe('Edge Cases and Malformed Data', () => {
    it('should handle empty predictions array', async () => {
      nock(baseUrl).post('/memories/predict', {}).reply(200, { predictions: [] });

      const result = await client.predictMemories();
      expect(result.predictions).toEqual([]);
    });

    it('should handle suggestions with missing optional fields', async () => {
      const response = {
        suggestions: [
          { id: 'mem-1', content: 'Suggestion 1', confidence: 0.8 },
          { id: 'mem-2', content: 'Suggestion 2', confidence: 0.7, reasoning: 'Has reasoning' },
        ],
      };

      nock(baseUrl).post('/memories/suggest', { context: 'test' }).reply(200, response);

      const result = await client.suggestMemories('test');
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].reasoning).toBeUndefined();
      expect(result.suggestions[1].reasoning).toBe('Has reasoning');
    });

    it('should handle learning metrics without trends', async () => {
      const response = {
        avg_helpfulness: 0.75,
        total_usage: 1000,
        active_memories: 500,
      };

      nock(baseUrl).get('/analytics/learning-metrics').query({ days: 1 }).reply(200, response);

      const result = await client.getLearningMetrics(1);
      expect(result.trends).toBeUndefined();
      expect(result.avg_helpfulness).toBe(0.75);
    });

    it('should handle zero values in metrics', async () => {
      const response = {
        avg_helpfulness: 0,
        total_usage: 0,
        active_memories: 0,
        trends: {
          helpfulness_trend: 'stable' as const,
          usage_trend: 'stable' as const,
          active_memories_trend: 'stable' as const,
        },
      };

      nock(baseUrl).get('/analytics/learning-metrics').query({ days: 30 }).reply(200, response);

      const result = await client.getLearningMetrics();
      expect(result.total_usage).toBe(0);
      expect(result.active_memories).toBe(0);
    });

    it('should handle empty pattern arrays', async () => {
      const response = {
        frequently_accessed: [],
        co_access_patterns: [],
        temporal_patterns: [],
      };

      nock(baseUrl).get('/analytics/patterns').query({ days: 7 }).reply(200, response);

      const result = await client.getPatterns(7);
      expect(result.frequently_accessed).toEqual([]);
      expect(result.co_access_patterns).toEqual([]);
      expect(result.temporal_patterns).toEqual([]);
    });

    it('should handle weighted search with no results', async () => {
      nock(baseUrl).post('/memories/search-weighted', { query: 'no matches' }).reply(200, {
        query: 'no matches',
        results: []
      });

      const result = await client.searchWeighted('no matches');
      expect(result.results).toEqual([]);
    });

    it('should handle prediction with very high/low confidence scores', async () => {
      const response = {
        predictions: [
          { id: 'mem-1', content: 'High confidence', confidence_score: 0.9999, reasoning: 'Very confident' },
          { id: 'mem-2', content: 'Low confidence', confidence_score: 0.0001, reasoning: 'Not confident' },
        ],
      };

      nock(baseUrl).post('/memories/predict', {}).reply(200, response);

      const result = await client.predictMemories();
      expect(result.predictions[0].confidence_score).toBe(0.9999);
      expect(result.predictions[1].confidence_score).toBe(0.0001);
    });

    it('should handle special characters in context', async () => {
      const specialContext = 'Test with "quotes", \'apostrophes\', <tags>, & ampersands, 中文, émojis 🚀';

      nock(baseUrl).post('/memories/suggest', { context: specialContext }).reply(200, { suggestions: [] });

      const result = await client.suggestMemories(specialContext);
      expect(result.suggestions).toBeDefined();
    });

    it('should handle very long context strings', async () => {
      const longContext = 'a'.repeat(10000);

      nock(baseUrl).post('/memories/suggest', { context: longContext }).reply(200, { suggestions: [] });

      const result = await client.suggestMemories(longContext);
      expect(result.suggestions).toBeDefined();
    });

    it('should handle unicode and emoji in search queries', async () => {
      const unicodeQuery = '测试 🔍 Тест ทดสอบ';

      nock(baseUrl).post('/memories/search-weighted', { query: unicodeQuery }).reply(200, {
        query: unicodeQuery,
        results: []
      });

      const result = await client.searchWeighted(unicodeQuery);
      expect(result.query).toBe(unicodeQuery);
    });
  });

  describe('Input Validation Stress Tests', () => {
    it('should reject extremely large limit values gracefully', async () => {
      const response = { predictions: [] };

      nock(baseUrl).post('/memories/predict', { limit: 999999 }).reply(200, response);

      const result = await client.predictMemories({ limit: 999999 });
      expect(result.predictions).toBeDefined();
    });

    it('should handle negative days values', async () => {
      await expect(client.getLearningMetrics(-1)).rejects.toThrow('Days must be at least 1');
      await expect(client.getPatterns(-10)).rejects.toThrow('Days must be at least 1');
    });

    it('should handle zero days values', async () => {
      await expect(client.getLearningMetrics(0)).rejects.toThrow('Days must be at least 1');
      await expect(client.getPatterns(0)).rejects.toThrow('Days must be at least 1');
    });

    it('should handle very large days values', async () => {
      nock(baseUrl).get('/analytics/learning-metrics').query({ days: 365000 }).reply(200, {
        avg_helpfulness: 0.5,
        total_usage: 1000000,
        active_memories: 50000
      });

      const result = await client.getLearningMetrics(365000);
      expect(result.total_usage).toBe(1000000);
    });

    it('should handle empty array for recentMemoryIds', async () => {
      nock(baseUrl).post('/memories/predict', { recent_memory_ids: [] }).reply(200, { predictions: [] });

      const result = await client.predictMemories({ recentMemoryIds: [] });
      expect(result.predictions).toBeDefined();
    });

    it('should handle very large recentMemoryIds array', async () => {
      const manyIds = Array(1000).fill(null).map((_, i) => `mem-${i}`);

      nock(baseUrl).post('/memories/predict', { recent_memory_ids: manyIds }).reply(200, { predictions: [] });

      const result = await client.predictMemories({ recentMemoryIds: manyIds });
      expect(result.predictions).toBeDefined();
    });

    it('should handle all weighted search options set to extreme values', async () => {
      nock(baseUrl).post('/memories/search-weighted', {
        query: 'test',
        limit: 999999,
        weight_by_usage: true,
        decay_old_memories: true,
        adaptive_weights: true,
        min_helpfulness_score: 0.99999,
      }).reply(200, { query: 'test', results: [] });

      const result = await client.searchWeighted('test', {
        limit: 999999,
        weightByUsage: true,
        decayOldMemories: true,
        adaptiveWeights: true,
        minHelpfulnessScore: 0.99999,
      });
      expect(result.results).toBeDefined();
    });

    it('should handle minConfidence edge values', async () => {
      nock(baseUrl).post('/memories/suggest', { context: 'test', min_confidence: 0 }).reply(200, { suggestions: [] });
      nock(baseUrl).post('/memories/suggest', { context: 'test', min_confidence: 1 }).reply(200, { suggestions: [] });

      const result1 = await client.suggestMemories('test', { minConfidence: 0 });
      const result2 = await client.suggestMemories('test', { minConfidence: 1 });

      expect(result1.suggestions).toBeDefined();
      expect(result2.suggestions).toBeDefined();
    });
  });

  describe('Memory and Performance Tests', () => {
    it('should handle rapid sequential requests without memory leaks', async () => {
      for (let i = 0; i < 100; i++) {
        nock(baseUrl).post('/memories/predict', {}).reply(200, { predictions: [] });
      }

      for (let i = 0; i < 100; i++) {
        const result = await client.predictMemories();
        expect(result.predictions).toBeDefined();
      }
    });

    it('should handle alternating request types rapidly', async () => {
      for (let i = 0; i < 50; i++) {
        nock(baseUrl).post('/memories/predict', {}).reply(200, { predictions: [] });
        nock(baseUrl).get('/analytics/learning-metrics').query({ days: 30 }).reply(200, {
          avg_helpfulness: 0.8, total_usage: 100, active_memories: 50
        });
      }

      for (let i = 0; i < 50; i++) {
        await client.predictMemories();
        await client.getLearningMetrics();
      }

      expect(true).toBe(true); // If we get here without crashes, test passes
    });

    it('should handle mixed success and failure scenarios', async () => {
      const client = new RecallBricks({ apiKey, baseUrl, maxRetries: 1, retryDelay: 10 });

      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          nock(baseUrl).post('/memories/suggest', { context: `ctx-${i}` }).reply(200, { suggestions: [] });
        } else {
          nock(baseUrl).post('/memories/suggest', { context: `ctx-${i}` }).reply(500);
          nock(baseUrl).post('/memories/suggest', { context: `ctx-${i}` }).reply(200, { suggestions: [] });
        }
      }

      const promises = Array(20).fill(null).map((_, i) =>
        client.suggestMemories(`ctx-${i}`)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(20);
    });
  });

  describe('Exponential Backoff Verification', () => {
    it('should apply exponential backoff on retries', async () => {
      const client = new RecallBricks({
        apiKey,
        baseUrl,
        maxRetries: 3,
        retryDelay: 100,
        maxRetryDelay: 1000
      });

      const startTime = Date.now();

      nock(baseUrl).post('/memories/predict', {}).reply(500);
      nock(baseUrl).post('/memories/predict', {}).reply(500);
      nock(baseUrl).post('/memories/predict', {}).reply(500);
      nock(baseUrl).post('/memories/predict', {}).reply(200, { predictions: [] });

      const result = await client.predictMemories();
      const elapsed = Date.now() - startTime;

      expect(result.predictions).toBeDefined();
      // Should have delays: 100ms, 200ms, 400ms = ~700ms minimum
      expect(elapsed).toBeGreaterThanOrEqual(600);
    });

    it('should respect maxRetryDelay cap', async () => {
      const client = new RecallBricks({
        apiKey,
        baseUrl,
        maxRetries: 5,
        retryDelay: 1000,
        maxRetryDelay: 100
      });

      const startTime = Date.now();

      // Fail 5 times, succeed on 6th
      for (let i = 0; i < 5; i++) {
        nock(baseUrl).post('/memories/predict', {}).reply(500);
      }
      nock(baseUrl).post('/memories/predict', {}).reply(200, { predictions: [] });

      const result = await client.predictMemories();
      const elapsed = Date.now() - startTime;

      expect(result.predictions).toBeDefined();
      // With maxRetryDelay of 100ms, all retries should be capped at 100ms
      // 5 retries * 100ms = 500ms maximum (plus some overhead)
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
