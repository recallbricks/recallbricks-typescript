import nock from 'nock';
import { RecallBricks } from '../src';

describe('Integration Tests', () => {
  const baseUrl = 'http://localhost:10002/api/v1';
  const apiKey = 'test-api-key';
  let client: RecallBricks;

  beforeEach(() => {
    client = new RecallBricks({ apiKey, baseUrl, maxRetries: 0 });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Full Workflow', () => {
    it('should create, search, and delete a memory', async () => {
      const memory = {
        id: 'mem-123',
        text: 'User prefers dark mode',
        tags: ['preference'],
        metadata: { userId: '456' },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      // Create
      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const created = await client.createMemory('User prefers dark mode', {
        tags: ['preference'],
        metadata: { userId: '456' },
      });
      expect(created.id).toBe('mem-123');

      // Search
      nock(baseUrl)
        .post('/memories/search')
        .reply(200, {
          query: 'dark mode',
          results: [{ memory, score: 0.95 }],
        });

      const searchResults = await client.search('dark mode');
      expect(searchResults.results).toHaveLength(1);
      expect(searchResults.results[0].memory.id).toBe('mem-123');

      // Delete
      nock(baseUrl)
        .delete('/memories/mem-123')
        .reply(204);

      const deleted = await client.deleteMemory('mem-123');
      expect(deleted).toBe(true);
    });

    it('should create, update, and retrieve a memory', async () => {
      const memory = {
        id: 'mem-456',
        text: 'Original text',
        tags: ['draft'],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      // Create
      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const created = await client.createMemory('Original text', {
        tags: ['draft'],
      });
      expect(created.id).toBe('mem-456');

      // Update
      const updated = {
        ...memory,
        text: 'Updated text',
        tags: ['published'],
        updated_at: '2025-01-02T00:00:00Z',
      };

      nock(baseUrl)
        .patch('/memories/mem-456')
        .reply(200, updated);

      const result = await client.updateMemory('mem-456', {
        text: 'Updated text',
        tags: ['published'],
      });
      expect(result.text).toBe('Updated text');
      expect(result.tags).toContain('published');

      // List and verify
      nock(baseUrl)
        .get('/memories')
        .reply(200, {
          memories: [updated],
          total: 1,
          limit: 10,
          offset: 0,
        });

      const list = await client.listMemories();
      expect(list.memories).toHaveLength(1);
      expect(list.memories[0].text).toBe('Updated text');
    });

    it('should create memories and explore graph relationships', async () => {
      const memory1 = {
        id: 'mem-1',
        text: 'Memory 1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const memory2 = {
        id: 'mem-2',
        text: 'Memory 2',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      // Create memories
      nock(baseUrl)
        .post('/memories')
        .reply(200, memory1)
        .post('/memories')
        .reply(200, memory2);

      await client.createMemory('Memory 1');
      await client.createMemory('Memory 2');

      // Get relationships
      nock(baseUrl)
        .get('/memories/mem-1/relationships')
        .reply(200, {
          memory_id: 'mem-1',
          outgoing: [
            {
              source_id: 'mem-1',
              target_id: 'mem-2',
              type: 'related',
              strength: 0.8,
            },
          ],
          incoming: [],
        });

      const relationships = await client.getRelationships('mem-1');
      expect(relationships.outgoing).toHaveLength(1);
      expect(relationships.outgoing[0].target_id).toBe('mem-2');

      // Get graph context
      nock(baseUrl)
        .get('/memories/mem-1/graph')
        .query({ depth: 2 })
        .reply(200, {
          root_id: 'mem-1',
          depth: 2,
          nodes: [
            {
              memory: memory1,
              depth: 0,
              relationships: [],
            },
            {
              memory: memory2,
              depth: 1,
              relationships: [
                {
                  source_id: 'mem-1',
                  target_id: 'mem-2',
                  type: 'related',
                  strength: 0.8,
                },
              ],
            },
          ],
          total_nodes: 2,
        });

      const graph = await client.getGraphContext('mem-1', 2);
      expect(graph.nodes).toHaveLength(2);
      expect(graph.total_nodes).toBe(2);
    });
  });

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      const memories = Array.from({ length: 25 }, (_, i) => ({
        id: `mem-${i}`,
        text: `Memory ${i}`,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }));

      // First page
      nock(baseUrl)
        .get('/memories')
        .query({ limit: 10, offset: 0 })
        .reply(200, {
          memories: memories.slice(0, 10),
          total: 25,
          limit: 10,
          offset: 0,
        });

      const page1 = await client.listMemories({ limit: 10, offset: 0 });
      expect(page1.memories).toHaveLength(10);
      expect(page1.total).toBe(25);

      // Second page
      nock(baseUrl)
        .get('/memories')
        .query({ limit: 10, offset: 10 })
        .reply(200, {
          memories: memories.slice(10, 20),
          total: 25,
          limit: 10,
          offset: 10,
        });

      const page2 = await client.listMemories({ limit: 10, offset: 10 });
      expect(page2.memories).toHaveLength(10);
      expect(page2.offset).toBe(10);

      // Third page (partial)
      nock(baseUrl)
        .get('/memories')
        .query({ limit: 10, offset: 20 })
        .reply(200, {
          memories: memories.slice(20, 25),
          total: 25,
          limit: 10,
          offset: 20,
        });

      const page3 = await client.listMemories({ limit: 10, offset: 20 });
      expect(page3.memories).toHaveLength(5);
    });
  });

  describe('Filtering and Search', () => {
    it('should filter by tags and search', async () => {
      const memories = [
        {
          id: 'mem-1',
          text: 'Important work item',
          tags: ['work', 'important'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'mem-2',
          text: 'Personal note',
          tags: ['personal'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      // List with tag filter
      nock(baseUrl)
        .get('/memories')
        .query({ tags: 'work' })
        .reply(200, {
          memories: [memories[0]],
          total: 1,
          limit: 10,
          offset: 0,
        });

      const filtered = await client.listMemories({ tags: ['work'] });
      expect(filtered.memories).toHaveLength(1);
      expect(filtered.memories[0].tags).toContain('work');

      // Search with tag filter
      nock(baseUrl)
        .post('/memories/search')
        .reply(200, {
          query: 'important',
          results: [
            {
              memory: memories[0],
              score: 0.95,
            },
          ],
        });

      const searchResults = await client.search('important', {
        tags: ['work'],
      });
      expect(searchResults.results).toHaveLength(1);
      expect(searchResults.results[0].score).toBeGreaterThan(0.9);
    });

    it('should filter by metadata', async () => {
      const memory = {
        id: 'mem-1',
        text: 'User data',
        metadata: { userId: '123', premium: true },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      nock(baseUrl)
        .get('/memories')
        .query({ metadata: JSON.stringify({ userId: '123' }) })
        .reply(200, {
          memories: [memory],
          total: 1,
          limit: 10,
          offset: 0,
        });

      const result = await client.listMemories({
        metadata: { userId: '123' },
      });
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].metadata?.userId).toBe('123');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent requests', async () => {
      const memories = Array.from({ length: 3 }, (_, i) => ({
        id: `mem-${i}`,
        text: `Memory ${i}`,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }));

      nock(baseUrl)
        .post('/memories')
        .times(3)
        .reply(200, (_uri, body: any) => ({
          id: `mem-${body.text.split(' ')[1]}`,
          text: body.text,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        }));

      const promises = memories.map(m => client.createMemory(m.text));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, i) => {
        expect(result.text).toBe(`Memory ${i}`);
      });
    });
  });
});
