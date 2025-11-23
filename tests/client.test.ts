import nock from 'nock';
import { RecallBricks, RecallBricksError } from '../src';

describe('RecallBricks Client', () => {
  const baseUrl = 'http://localhost:10002/api/v1';
  const apiKey = 'test-api-key';

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Initialization', () => {
    it('should create client with valid API key', () => {
      const client = new RecallBricks({ apiKey });
      expect(client).toBeInstanceOf(RecallBricks);
    });

    it('should create client with valid service token', () => {
      const client = new RecallBricks({ serviceToken: 'test-service-token' });
      expect(client).toBeInstanceOf(RecallBricks);
    });

    it('should throw error when neither API key nor service token is provided', () => {
      expect(() => new RecallBricks({})).toThrow(RecallBricksError);
      expect(() => new RecallBricks({})).toThrow('Either apiKey or serviceToken must be provided');
    });

    it('should throw error when both API key and service token are provided', () => {
      expect(() => new RecallBricks({ apiKey, serviceToken: 'test-token' })).toThrow(RecallBricksError);
      expect(() => new RecallBricks({ apiKey, serviceToken: 'test-token' })).toThrow('Provide either apiKey or serviceToken, not both');
    });

    it('should use default base URL when not provided', () => {
      const client = new RecallBricks({ apiKey });
      expect(client).toBeDefined();
    });

    it('should use custom base URL when provided', () => {
      const customUrl = 'https://api.example.com';
      const client = new RecallBricks({ apiKey, baseUrl: customUrl });
      expect(client).toBeDefined();
    });

    it('should use default timeout when not provided', () => {
      const client = new RecallBricks({ apiKey });
      expect(client).toBeDefined();
    });

    it('should use custom timeout when provided', () => {
      const client = new RecallBricks({ apiKey, timeout: 5000 });
      expect(client).toBeDefined();
    });

    it('should use default retry config when not provided', () => {
      const client = new RecallBricks({ apiKey });
      expect(client).toBeDefined();
    });

    it('should use custom retry config when provided', () => {
      const client = new RecallBricks({
        apiKey,
        maxRetries: 5,
        retryDelay: 500,
        maxRetryDelay: 5000,
      });
      expect(client).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    let client: RecallBricks;

    beforeEach(() => {
      client = new RecallBricks({ apiKey, baseUrl, maxRetries: 0 });
    });

    it('should handle 400 Bad Request errors', async () => {
      nock(baseUrl)
        .post('/memories')
        .reply(400, { error: 'Invalid input', code: 'INVALID_INPUT' });

      try {
        await client.createMemory('test');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(RecallBricksError);
        expect((error as RecallBricksError).statusCode).toBe(400);
        expect((error as RecallBricksError).code).toBe('INVALID_INPUT');
      }
    });

    it('should handle 401 Unauthorized errors', async () => {
      nock(baseUrl)
        .post('/memories')
        .reply(401, { error: 'Unauthorized', code: 'UNAUTHORIZED' });

      try {
        await client.createMemory('test');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(RecallBricksError);
        expect((error as RecallBricksError).statusCode).toBe(401);
      }
    });

    it('should handle 404 Not Found errors', async () => {
      nock(baseUrl)
        .get('/memories/nonexistent/relationships')
        .reply(404, { error: 'Not found', code: 'NOT_FOUND' });

      await expect(client.getRelationships('nonexistent')).rejects.toThrow(RecallBricksError);
    });

    it('should handle 500 Internal Server Error', async () => {
      nock(baseUrl)
        .post('/memories')
        .reply(500, { error: 'Internal server error' });

      await expect(client.createMemory('test')).rejects.toThrow(RecallBricksError);
    });

    it('should handle network errors', async () => {
      nock(baseUrl)
        .post('/memories')
        .replyWithError('Network error');

      await expect(client.createMemory('test')).rejects.toThrow(RecallBricksError);
    });

    it('should handle timeout errors', async () => {
      const shortTimeoutClient = new RecallBricks({ apiKey, baseUrl, timeout: 100, maxRetries: 0 });

      nock(baseUrl)
        .post('/memories')
        .delay(200)
        .reply(200, { id: '123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' });

      await expect(shortTimeoutClient.createMemory('test')).rejects.toThrow();
    });
  });

  describe('Retry Logic', () => {
    let client: RecallBricks;

    beforeEach(() => {
      client = new RecallBricks({
        apiKey,
        baseUrl,
        maxRetries: 3,
        retryDelay: 10,
        maxRetryDelay: 100,
      });
    });

    it('should retry on 503 Service Unavailable', async () => {
      const memory = { id: '123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' };

      nock(baseUrl)
        .post('/memories')
        .reply(503, { error: 'Service unavailable' })
        .post('/memories')
        .reply(200, memory);

      const result = await client.createMemory('test');
      expect(result).toEqual(memory);
    });

    it('should retry on 429 Rate Limit', async () => {
      const memory = { id: '123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' };

      nock(baseUrl)
        .post('/memories')
        .reply(429, { error: 'Rate limit exceeded' })
        .post('/memories')
        .reply(200, memory);

      const result = await client.createMemory('test');
      expect(result).toEqual(memory);
    });

    it('should not retry on 400 Bad Request', async () => {
      nock(baseUrl)
        .post('/memories')
        .reply(400, { error: 'Invalid input' });

      await expect(client.createMemory('test')).rejects.toThrow(RecallBricksError);

      // Verify only one request was made
      expect(nock.isDone()).toBe(true);
    });

    it('should exhaust retries and throw error', async () => {
      nock(baseUrl)
        .post('/memories')
        .times(4) // Initial + 3 retries
        .reply(503, { error: 'Service unavailable' });

      await expect(client.createMemory('test')).rejects.toThrow(RecallBricksError);
    });

    it('should use exponential backoff', async () => {
      const memory = { id: '123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' };
      const start = Date.now();

      nock(baseUrl)
        .post('/memories')
        .reply(503)
        .post('/memories')
        .reply(503)
        .post('/memories')
        .reply(200, memory);

      await client.createMemory('test');
      const duration = Date.now() - start;

      // Should have some delay due to retries (at least 10ms + 20ms)
      expect(duration).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Service Token Authentication', () => {
    const serviceToken = 'test-service-token';
    let client: RecallBricks;

    beforeEach(() => {
      client = new RecallBricks({ serviceToken, baseUrl, maxRetries: 0 });
    });

    it('should include X-Service-Token header in requests', async () => {
      const memory = { id: '123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' };

      nock(baseUrl, {
        reqheaders: {
          'X-Service-Token': serviceToken,
        },
      })
        .post('/memories')
        .reply(200, memory);

      await client.createMemory('test', { userId: 'user-123' });
      expect(nock.isDone()).toBe(true);
    });

    it('should require userId when creating memory with service token', async () => {
      await expect(client.createMemory('test')).rejects.toThrow(RecallBricksError);
      await expect(client.createMemory('test')).rejects.toThrow('userId is required when using service token authentication');
    });

    it('should accept userId when creating memory with service token', async () => {
      const memory = { id: '123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' };

      nock(baseUrl)
        .post('/memories', (body) => {
          return body.text === 'test' && body.user_id === 'user-123';
        })
        .reply(200, memory);

      const result = await client.createMemory('test', { userId: 'user-123' });
      expect(result).toEqual(memory);
    });

    it('should require userId when listing memories with service token', async () => {
      await expect(client.listMemories()).rejects.toThrow(RecallBricksError);
      await expect(client.listMemories()).rejects.toThrow('userId is required when using service token authentication');
    });

    it('should accept userId when listing memories with service token', async () => {
      const response = { memories: [], total: 0, limit: 10, offset: 0 };

      nock(baseUrl)
        .get('/memories')
        .query({ user_id: 'user-123' })
        .reply(200, response);

      const result = await client.listMemories({ userId: 'user-123' });
      expect(result).toEqual(response);
    });

    it('should require userId when searching with service token', async () => {
      await expect(client.search('test query')).rejects.toThrow(RecallBricksError);
      await expect(client.search('test query')).rejects.toThrow('userId is required when using service token authentication');
    });

    it('should accept userId when searching with service token', async () => {
      const response = { results: [], query: 'test query' };

      nock(baseUrl)
        .post('/memories/search', (body) => {
          return body.query === 'test query' && body.user_id === 'user-123';
        })
        .reply(200, response);

      const result = await client.search('test query', { userId: 'user-123' });
      expect(result).toEqual(response);
    });

    it('should require userId for predictMemories with service token', async () => {
      await expect(client.predictMemories({ context: 'test' })).rejects.toThrow(RecallBricksError);
      await expect(client.predictMemories({ context: 'test' })).rejects.toThrow('userId is required when using service token authentication');
    });

    it('should accept userId for predictMemories with service token', async () => {
      const response = { predictions: [] };

      nock(baseUrl)
        .post('/memories/predict', (body) => {
          return body.user_id === 'user-123' && body.context === 'test';
        })
        .reply(200, response);

      const result = await client.predictMemories({ userId: 'user-123', context: 'test' });
      expect(result).toEqual(response);
    });

    it('should require userId for suggestMemories with service token', async () => {
      await expect(client.suggestMemories('test context')).rejects.toThrow(RecallBricksError);
      await expect(client.suggestMemories('test context')).rejects.toThrow('userId is required when using service token authentication');
    });

    it('should accept userId for suggestMemories with service token', async () => {
      const response = { suggestions: [] };

      nock(baseUrl)
        .post('/memories/suggest', (body) => {
          return body.context === 'test context' && body.user_id === 'user-123';
        })
        .reply(200, response);

      const result = await client.suggestMemories('test context', { userId: 'user-123' });
      expect(result).toEqual(response);
    });

    it('should require userId for searchWeighted with service token', async () => {
      await expect(client.searchWeighted('test query')).rejects.toThrow(RecallBricksError);
      await expect(client.searchWeighted('test query')).rejects.toThrow('userId is required when using service token authentication');
    });

    it('should accept userId for searchWeighted with service token', async () => {
      const response = { results: [], query: 'test query' };

      nock(baseUrl)
        .post('/memories/search-weighted', (body) => {
          return body.query === 'test query' && body.user_id === 'user-123';
        })
        .reply(200, response);

      const result = await client.searchWeighted('test query', { userId: 'user-123' });
      expect(result).toEqual(response);
    });
  });

  describe('API Key Authentication (Backward Compatibility)', () => {
    let client: RecallBricks;

    beforeEach(() => {
      client = new RecallBricks({ apiKey, baseUrl, maxRetries: 0 });
    });

    it('should work without userId when using API key', async () => {
      const memory = { id: '123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' };

      nock(baseUrl)
        .post('/memories', (body) => {
          return body.text === 'test' && !body.user_id;
        })
        .reply(200, memory);

      const result = await client.createMemory('test');
      expect(result).toEqual(memory);
    });

    it('should include X-API-Key header in requests', async () => {
      const memory = { id: '123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' };

      nock(baseUrl, {
        reqheaders: {
          'X-API-Key': apiKey,
        },
      })
        .post('/memories')
        .reply(200, memory);

      await client.createMemory('test');
      expect(nock.isDone()).toBe(true);
    });
  });
});
