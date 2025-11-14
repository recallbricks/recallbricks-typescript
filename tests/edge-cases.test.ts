import nock from 'nock';
import { RecallBricks, RecallBricksError } from '../src';

describe('Edge Cases and Error Handling', () => {
  const baseUrl = 'http://localhost:10002/api/v1';
  const apiKey = 'test-api-key';
  let client: RecallBricks;

  beforeEach(() => {
    client = new RecallBricks({ apiKey, baseUrl, maxRetries: 0 });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Input Validation', () => {
    it('should handle very long text', async () => {
      const longText = 'a'.repeat(100000);
      const memory = {
        id: 'mem-123',
        text: longText,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const result = await client.createMemory(longText);
      expect(result.text).toBe(longText);
    });

    it('should handle special characters in text', async () => {
      const specialText = 'Special chars: !@#$%^&*()_+-=[]{}|;:\'",.<>?/~`\n\t\r';
      const memory = {
        id: 'mem-123',
        text: specialText,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const result = await client.createMemory(specialText);
      expect(result.text).toBe(specialText);
    });

    it('should handle unicode and emoji in text', async () => {
      const unicodeText = 'Hello 世界 🌍 🚀 مرحبا';
      const memory = {
        id: 'mem-123',
        text: unicodeText,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const result = await client.createMemory(unicodeText);
      expect(result.text).toBe(unicodeText);
    });

    it('should handle empty arrays in options', async () => {
      const memory = {
        id: 'mem-123',
        text: 'Test',
        tags: [],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const result = await client.createMemory('Test', { tags: [] });
      expect(result.tags).toEqual([]);
    });

    it('should handle empty metadata object', async () => {
      const memory = {
        id: 'mem-123',
        text: 'Test',
        metadata: {},
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const result = await client.createMemory('Test', { metadata: {} });
      expect(result.metadata).toEqual({});
    });

    it('should handle large metadata objects', async () => {
      const largeMetadata: Record<string, string | number | boolean | null> = {};
      for (let i = 0; i < 100; i++) {
        largeMetadata[`key${i}`] = `value${i}`;
      }

      const memory = {
        id: 'mem-123',
        text: 'Test',
        metadata: largeMetadata,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const result = await client.createMemory('Test', { metadata: largeMetadata });
      expect(result.metadata).toEqual(largeMetadata);
    });

    it('should handle many tags', async () => {
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag${i}`);
      const memory = {
        id: 'mem-123',
        text: 'Test',
        tags: manyTags,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const result = await client.createMemory('Test', { tags: manyTags });
      expect(result.tags).toEqual(manyTags);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle limit of 0', async () => {
      nock(baseUrl)
        .get('/memories')
        .query({ limit: 0 })
        .reply(200, {
          memories: [],
          total: 100,
          limit: 0,
          offset: 0,
        });

      const result = await client.listMemories({ limit: 0 });
      expect(result.memories).toHaveLength(0);
    });

    it('should handle very large limit', async () => {
      nock(baseUrl)
        .get('/memories')
        .query({ limit: 10000 })
        .reply(200, {
          memories: [],
          total: 50,
          limit: 10000,
          offset: 0,
        });

      const result = await client.listMemories({ limit: 10000 });
      expect(result.limit).toBe(10000);
    });

    it('should handle very large offset', async () => {
      nock(baseUrl)
        .get('/memories')
        .query({ offset: 1000000 })
        .reply(200, {
          memories: [],
          total: 100,
          limit: 10,
          offset: 1000000,
        });

      const result = await client.listMemories({ offset: 1000000 });
      expect(result.memories).toHaveLength(0);
    });

    it('should handle threshold of 0', async () => {
      nock(baseUrl)
        .post('/memories/search')
        .reply(200, {
          query: 'test',
          results: [],
        });

      const result = await client.search('test', { threshold: 0 });
      expect(result.results).toBeDefined();
    });

    it('should handle threshold of 1', async () => {
      nock(baseUrl)
        .post('/memories/search')
        .reply(200, {
          query: 'test',
          results: [],
        });

      const result = await client.search('test', { threshold: 1 });
      expect(result.results).toBeDefined();
    });

    it('should handle graph depth of 1', async () => {
      nock(baseUrl)
        .get('/memories/mem-123/graph')
        .query({ depth: 1 })
        .reply(200, {
          root_id: 'mem-123',
          depth: 1,
          nodes: [],
          total_nodes: 0,
        });

      const result = await client.getGraphContext('mem-123', 1);
      expect(result.depth).toBe(1);
    });

    it('should handle graph depth of 10', async () => {
      nock(baseUrl)
        .get('/memories/mem-123/graph')
        .query({ depth: 10 })
        .reply(200, {
          root_id: 'mem-123',
          depth: 10,
          nodes: [],
          total_nodes: 0,
        });

      const result = await client.getGraphContext('mem-123', 10);
      expect(result.depth).toBe(10);
    });
  });

  describe('Malformed Responses', () => {
    it('should handle missing required fields in response', async () => {
      nock(baseUrl)
        .post('/memories')
        .reply(200, { id: 'mem-123' }); // Missing text and timestamps

      const result = await client.createMemory('test');
      expect(result.id).toBe('mem-123');
    });

    it('should handle unexpected field types in response', async () => {
      nock(baseUrl)
        .post('/memories')
        .reply(200, {
          id: 123, // Should be string
          text: 'test',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        });

      const result = await client.createMemory('test');
      expect(result).toBeDefined();
    });
  });

  describe('Network Edge Cases', () => {
    it('should handle very slow responses', async () => {
      const slowClient = new RecallBricks({
        apiKey,
        baseUrl,
        timeout: 5000,
        maxRetries: 0,
      });

      nock(baseUrl)
        .post('/memories')
        .delay(100)
        .reply(200, {
          id: 'mem-123',
          text: 'test',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        });

      const result = await slowClient.createMemory('test');
      expect(result.id).toBe('mem-123');
    });

    it('should handle connection reset', async () => {
      nock(baseUrl)
        .post('/memories')
        .replyWithError({ code: 'ECONNRESET' });

      await expect(client.createMemory('test')).rejects.toThrow(RecallBricksError);
    });

    it('should handle DNS resolution failure', async () => {
      nock(baseUrl)
        .post('/memories')
        .replyWithError({ code: 'ENOTFOUND' });

      await expect(client.createMemory('test')).rejects.toThrow(RecallBricksError);
    });
  });

  describe('Type Safety', () => {
    it('should preserve type information for metadata', async () => {
      const metadata = {
        stringField: 'value',
        numberField: 42,
        booleanField: true,
        nullField: null,
      };

      const memory = {
        id: 'mem-123',
        text: 'test',
        metadata,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const result = await client.createMemory('test', { metadata });
      expect(result.metadata).toEqual(metadata);
      expect(typeof result.metadata?.numberField).toBe('number');
      expect(typeof result.metadata?.booleanField).toBe('boolean');
    });

    it('should handle null values in metadata', async () => {
      const metadata = { field: null };
      const memory = {
        id: 'mem-123',
        text: 'test',
        metadata,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const result = await client.createMemory('test', { metadata });
      expect(result.metadata?.field).toBeNull();
    });
  });

  describe('Concurrent Edge Cases', () => {
    it('should handle rapid successive requests', async () => {
      nock(baseUrl)
        .post('/memories')
        .times(10)
        .reply(200, (_uri, body: any) => ({
          id: `mem-${Math.random()}`,
          text: body.text,
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        }));

      const promises = Array.from({ length: 10 }, (_, i) =>
        client.createMemory(`Memory ${i}`)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    });

    it('should handle mixed success and failure', async () => {
      nock(baseUrl)
        .post('/memories')
        .reply(200, { id: 'mem-1', text: 'success', created_at: '2025-01-01', updated_at: '2025-01-01' })
        .post('/memories')
        .reply(500, { error: 'Server error' })
        .post('/memories')
        .reply(200, { id: 'mem-2', text: 'success', created_at: '2025-01-01', updated_at: '2025-01-01' });

      const results = await Promise.allSettled([
        client.createMemory('test1'),
        client.createMemory('test2'),
        client.createMemory('test3'),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });
});
