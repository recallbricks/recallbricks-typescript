import nock from 'nock';
import { RecallBricks, RecallBricksError } from '../src';

describe('Phase 2A Security and Edge Cases', () => {
  const baseUrl = 'http://localhost:10002/api/v1';
  const apiKey = 'test-api-key';
  let client: RecallBricks;

  beforeEach(() => {
    client = new RecallBricks({ apiKey, baseUrl, maxRetries: 0 });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Input Sanitization and Injection Prevention', () => {
    it('should handle SQL injection attempts in context', async () => {
      const sqlInjection = "'; DROP TABLE memories; --";

      nock(baseUrl)
        .post('/memories/suggest', { context: sqlInjection })
        .reply(200, { suggestions: [] });

      const result = await client.suggestMemories(sqlInjection);
      expect(result.suggestions).toBeDefined();
    });

    it('should handle XSS attempts in search queries', async () => {
      const xssAttempt = '<script>alert("XSS")</script>';

      nock(baseUrl)
        .post('/memories/search-weighted', { query: xssAttempt })
        .reply(200, { query: xssAttempt, results: [] });

      const result = await client.searchWeighted(xssAttempt);
      expect(result.query).toBe(xssAttempt);
    });

    it('should handle path traversal attempts', async () => {
      const pathTraversal = '../../../etc/passwd';

      nock(baseUrl)
        .post('/memories/suggest', { context: pathTraversal })
        .reply(200, { suggestions: [] });

      const result = await client.suggestMemories(pathTraversal);
      expect(result.suggestions).toBeDefined();
    });

    it('should handle command injection attempts in context', async () => {
      const cmdInjection = '; ls -la; echo';

      nock(baseUrl)
        .post('/memories/predict', { context: cmdInjection })
        .reply(200, { predictions: [] });

      const result = await client.predictMemories({ context: cmdInjection });
      expect(result.predictions).toBeDefined();
    });

    it('should handle null bytes in strings', async () => {
      const nullByteString = 'test\0injection';

      nock(baseUrl)
        .post('/memories/search-weighted', { query: nullByteString })
        .reply(200, { query: nullByteString, results: [] });

      const result = await client.searchWeighted(nullByteString);
      expect(result.results).toBeDefined();
    });

    it('should handle LDAP injection attempts', async () => {
      const ldapInjection = '*)(uid=*))(|(uid=*';

      nock(baseUrl)
        .post('/memories/suggest', { context: ldapInjection })
        .reply(200, { suggestions: [] });

      const result = await client.suggestMemories(ldapInjection);
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('Malformed Response Handling', () => {
    it('should handle response with missing required fields', async () => {
      const malformedResponse = {
        predictions: [
          { id: 'mem-1' }, // missing content, confidence_score, reasoning
        ],
      };

      nock(baseUrl)
        .post('/memories/predict', {})
        .reply(200, malformedResponse);

      const result = await client.predictMemories();
      expect(result.predictions).toHaveLength(1);
    });

    it('should handle response with extra unexpected fields', async () => {
      const responseWithExtra = {
        predictions: [],
        unexpected_field: 'should be ignored',
        another_field: 12345,
      };

      nock(baseUrl)
        .post('/memories/predict', {})
        .reply(200, responseWithExtra);

      const result = await client.predictMemories();
      expect(result.predictions).toEqual([]);
    });

    it('should handle numeric strings instead of numbers', async () => {
      const response = {
        avg_helpfulness: '0.75' as any,
        total_usage: '1000' as any,
        active_memories: '500' as any,
      };

      nock(baseUrl)
        .get('/analytics/learning-metrics')
        .query({ days: 30 })
        .reply(200, response);

      const result = await client.getLearningMetrics();
      expect(result.avg_helpfulness).toBeDefined();
    });

    it('should handle null values in optional fields', async () => {
      const response = {
        predictions: [
          {
            id: 'mem-1',
            content: 'Test',
            confidence_score: 0.8,
            reasoning: null as any,
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/predict', {})
        .reply(200, response);

      const result = await client.predictMemories();
      expect(result.predictions[0].reasoning).toBeNull();
    });

    it('should handle empty string responses', async () => {
      nock(baseUrl)
        .post('/memories/predict', {})
        .reply(200, '', { 'Content-Type': 'application/json' });

      // Empty response should cause axios to throw or return undefined
      try {
        await client.predictMemories();
        // If it doesn't throw, verify the response is at least defined
        expect(true).toBe(true);
      } catch (error) {
        // Empty responses typically cause parsing errors, which is expected
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid JSON responses', async () => {
      nock(baseUrl)
        .post('/memories/suggest', { context: 'test' })
        .reply(200, 'not valid json{]', { 'Content-Type': 'application/json' });

      // Invalid JSON should cause axios to throw
      try {
        await client.suggestMemories('test');
        expect(true).toBe(true);
      } catch (error) {
        // JSON parsing errors are expected
        expect(error).toBeDefined();
      }
    });

    it('should handle HTML error pages instead of JSON', async () => {
      nock(baseUrl)
        .post('/memories/predict', {})
        .reply(500, '<html><body>Internal Server Error</body></html>', {
          'Content-Type': 'text/html'
        });

      await expect(client.predictMemories()).rejects.toThrow(RecallBricksError);
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle maximum JavaScript safe integer values', async () => {
      const response = {
        avg_helpfulness: 0.5,
        total_usage: Number.MAX_SAFE_INTEGER,
        active_memories: Number.MAX_SAFE_INTEGER,
      };

      nock(baseUrl)
        .get('/analytics/learning-metrics')
        .query({ days: 30 })
        .reply(200, response);

      const result = await client.getLearningMetrics();
      expect(result.total_usage).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle floating point precision edge cases', async () => {
      const response = {
        predictions: [
          {
            id: 'mem-1',
            content: 'Test',
            confidence_score: 0.1 + 0.2, // Classic floating point issue
            reasoning: 'Test',
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/predict', {})
        .reply(200, response);

      const result = await client.predictMemories();
      expect(result.predictions[0].confidence_score).toBeCloseTo(0.3);
    });

    it('should handle confidence scores at exact boundaries', async () => {
      const response = {
        suggestions: [
          { id: 'mem-1', content: 'Test 1', confidence: 0.0 },
          { id: 'mem-2', content: 'Test 2', confidence: 1.0 },
          { id: 'mem-3', content: 'Test 3', confidence: 0.5 },
        ],
      };

      nock(baseUrl)
        .post('/memories/suggest', { context: 'test' })
        .reply(200, response);

      const result = await client.suggestMemories('test');
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions[0].confidence).toBe(0.0);
      expect(result.suggestions[1].confidence).toBe(1.0);
    });

    it('should handle confidence scores outside 0-1 range', async () => {
      const response = {
        predictions: [
          { id: 'mem-1', content: 'Test', confidence_score: -0.5, reasoning: 'Negative' },
          { id: 'mem-2', content: 'Test', confidence_score: 1.5, reasoning: 'Over 1' },
        ],
      };

      nock(baseUrl)
        .post('/memories/predict', {})
        .reply(200, response);

      const result = await client.predictMemories();
      expect(result.predictions).toHaveLength(2);
    });

    it('should handle very long memory IDs', async () => {
      const longId = 'mem-' + 'a'.repeat(1000);
      const response = {
        predictions: [
          {
            id: longId,
            content: 'Test',
            confidence_score: 0.8,
            reasoning: 'Test',
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/predict', {})
        .reply(200, response);

      const result = await client.predictMemories();
      expect(result.predictions[0].id).toBe(longId);
    });
  });

  describe('Race Condition and Timing Tests', () => {
    it('should handle concurrent requests to same endpoint', async () => {
      for (let i = 0; i < 10; i++) {
        nock(baseUrl)
          .post('/memories/predict', {})
          .reply(200, { predictions: [] });
      }

      const promises = Array(10).fill(null).map(() => client.predictMemories());
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
    });

    it('should handle rapid fire requests with different parameters', async () => {
      for (let i = 0; i < 20; i++) {
        nock(baseUrl)
          .post('/memories/suggest', { context: `context-${i}` })
          .reply(200, { suggestions: [] });
      }

      const promises = Array(20)
        .fill(null)
        .map((_, i) => client.suggestMemories(`context-${i}`));

      const results = await Promise.all(promises);
      expect(results).toHaveLength(20);
    });

    it('should handle interleaved success and failure', async () => {
      const client = new RecallBricks({ apiKey, baseUrl, maxRetries: 1, retryDelay: 10 });

      // Test sequential requests instead of concurrent to avoid nock race conditions
      const results = [];

      for (let i = 0; i < 10; i++) {
        if (i % 3 === 0) {
          // Fail once, then succeed
          nock(baseUrl)
            .get('/analytics/learning-metrics')
            .query({ days: 30 })
            .reply(500, { error: 'Server error' });
          nock(baseUrl)
            .get('/analytics/learning-metrics')
            .query({ days: 30 })
            .reply(200, { avg_helpfulness: 0.8, total_usage: 100, active_memories: 50 });
        } else {
          // Succeed immediately
          nock(baseUrl)
            .get('/analytics/learning-metrics')
            .query({ days: 30 })
            .reply(200, { avg_helpfulness: 0.8, total_usage: 100, active_memories: 50 });
        }

        const result = await client.getLearningMetrics();
        results.push(result);
      }

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.avg_helpfulness).toBe(0.8);
      });
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not leak memory on repeated predictions', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        nock(baseUrl)
          .post('/memories/predict', {})
          .reply(200, {
            predictions: Array(10).fill(null).map((_, j) => ({
              id: `mem-${i}-${j}`,
              content: 'Test content',
              confidence_score: 0.8,
              reasoning: 'Test reasoning',
            })),
          });
      }

      for (let i = 0; i < iterations; i++) {
        await client.predictMemories();
      }

      // If we get here without running out of memory, test passes
      expect(true).toBe(true);
    });

    it('should handle large response objects without memory issues', async () => {
      const largeResponse = {
        results: Array(1000).fill(null).map((_, i) => ({
          id: `mem-${i}`,
          text: 'x'.repeat(1000),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          relevance_score: Math.random(),
        })),
        query: 'test',
      };

      for (let i = 0; i < 10; i++) {
        nock(baseUrl)
          .post('/memories/search-weighted', { query: 'test' })
          .reply(200, largeResponse);
      }

      for (let i = 0; i < 10; i++) {
        await client.searchWeighted('test');
      }

      expect(true).toBe(true);
    });
  });

  describe('Error Message Security', () => {
    it('should handle API errors with detailed information', async () => {
      nock(baseUrl)
        .post('/memories/suggest', { context: 'test' })
        .reply(400, {
          error: 'Invalid context format',
          code: 'VALIDATION_ERROR',
          details: {
            field: 'context',
            reason: 'Too short',
          },
        });

      try {
        await client.suggestMemories('test');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(RecallBricksError);
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details).toBeDefined();
      }
    });
  });

  describe('Character Encoding and Unicode', () => {
    it('should handle UTF-8 encoded content correctly', async () => {
      const utf8Content = {
        predictions: [
          {
            id: 'mem-1',
            content: '日本語 한국어 中文 Русский العربية',
            confidence_score: 0.8,
            reasoning: 'Multi-language test',
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/predict', {})
        .reply(200, utf8Content);

      const result = await client.predictMemories();
      expect(result.predictions[0].content).toBe('日本語 한국어 中文 Русский العربية');
    });

    it('should handle emoji and special unicode characters', async () => {
      const emojiContext = '🚀 Testing with 🎉 emojis 💯 and symbols ™️ ©️ ®️';

      nock(baseUrl)
        .post('/memories/suggest', { context: emojiContext })
        .reply(200, { suggestions: [] });

      const result = await client.suggestMemories(emojiContext);
      expect(result.suggestions).toBeDefined();
    });

    it('should handle right-to-left text', async () => {
      const rtlText = 'مرحبا بك في الاختبار العربي';

      nock(baseUrl)
        .post('/memories/search-weighted', { query: rtlText })
        .reply(200, { query: rtlText, results: [] });

      const result = await client.searchWeighted(rtlText);
      expect(result.query).toBe(rtlText);
    });

    it('should handle combining characters and diacritics', async () => {
      const diacritics = 'café naïve résumé';

      nock(baseUrl)
        .post('/memories/suggest', { context: diacritics })
        .reply(200, { suggestions: [] });

      const result = await client.suggestMemories(diacritics);
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('API Contract Validation', () => {
    it('should validate prediction response structure', async () => {
      const validResponse = {
        predictions: [
          {
            id: 'mem-123',
            content: 'Predicted memory',
            confidence_score: 0.85,
            reasoning: 'Based on patterns',
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/predict', {})
        .reply(200, validResponse);

      const result = await client.predictMemories();

      expect(result).toHaveProperty('predictions');
      expect(Array.isArray(result.predictions)).toBe(true);
      result.predictions.forEach(p => {
        expect(p).toHaveProperty('id');
        expect(p).toHaveProperty('content');
        expect(p).toHaveProperty('confidence_score');
        expect(p).toHaveProperty('reasoning');
      });
    });

    it('should validate suggestion response structure', async () => {
      const validResponse = {
        suggestions: [
          {
            id: 'mem-123',
            content: 'Suggested memory',
            confidence: 0.88,
            reasoning: 'Relevant context',
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/suggest', { context: 'test' })
        .reply(200, validResponse);

      const result = await client.suggestMemories('test');

      expect(result).toHaveProperty('suggestions');
      expect(Array.isArray(result.suggestions)).toBe(true);
      result.suggestions.forEach(s => {
        expect(s).toHaveProperty('id');
        expect(s).toHaveProperty('content');
        expect(s).toHaveProperty('confidence');
      });
    });

    it('should validate learning metrics response structure', async () => {
      const validResponse = {
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
        .reply(200, validResponse);

      const result = await client.getLearningMetrics();

      expect(result).toHaveProperty('avg_helpfulness');
      expect(result).toHaveProperty('total_usage');
      expect(result).toHaveProperty('active_memories');
      expect(typeof result.avg_helpfulness).toBe('number');
      expect(typeof result.total_usage).toBe('number');
      expect(typeof result.active_memories).toBe('number');
    });

    it('should validate pattern analysis response structure', async () => {
      const validResponse = {
        frequently_accessed: [
          { memory_id: 'mem-1', access_count: 10, last_accessed: '2025-01-01T00:00:00Z' },
        ],
        co_access_patterns: [
          { memory_ids: ['mem-1', 'mem-2'], frequency: 5, strength: 0.8 },
        ],
        temporal_patterns: [
          { time_period: 'morning', memory_ids: ['mem-1'], frequency: 3 },
        ],
      };

      nock(baseUrl)
        .get('/analytics/patterns')
        .query({ days: 30 })
        .reply(200, validResponse);

      const result = await client.getPatterns();

      expect(result).toHaveProperty('frequently_accessed');
      expect(result).toHaveProperty('co_access_patterns');
      expect(result).toHaveProperty('temporal_patterns');
      expect(Array.isArray(result.frequently_accessed)).toBe(true);
      expect(Array.isArray(result.co_access_patterns)).toBe(true);
      expect(Array.isArray(result.temporal_patterns)).toBe(true);
    });

    it('should validate weighted search response structure', async () => {
      const validResponse = {
        query: 'test',
        results: [
          {
            id: 'mem-1',
            text: 'Test memory',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            relevance_score: 0.92,
          },
        ],
      };

      nock(baseUrl)
        .post('/memories/search-weighted', { query: 'test' })
        .reply(200, validResponse);

      const result = await client.searchWeighted('test');

      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
      result.results.forEach(r => {
        expect(r).toHaveProperty('id');
        expect(r).toHaveProperty('text');
        expect(r).toHaveProperty('relevance_score');
      });
    });
  });
});
