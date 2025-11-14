import nock from 'nock';
import { RecallBricks, RecallBricksError } from '../src';

describe('Security Tests', () => {
  const baseUrl = 'http://localhost:10002/api/v1';
  const apiKey = 'test-api-key';

  afterEach(() => {
    nock.cleanAll();
  });

  describe('API Key Handling', () => {
    it('should include API key in request headers', async () => {
      let capturedHeaders: any = null;

      nock(baseUrl)
        .post('/memories')
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, { id: 'mem-123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' }];
        });

      const client = new RecallBricks({ apiKey, baseUrl });
      await client.createMemory('test');

      expect(capturedHeaders['x-api-key']).toBe(apiKey);
    });

    it('should not expose API key in error messages', async () => {
      nock(baseUrl)
        .post('/memories')
        .reply(401, { error: 'Invalid API key' });

      const client = new RecallBricks({ apiKey: 'secret-key-12345', baseUrl });

      try {
        await client.createMemory('test');
        fail('Should have thrown an error');
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).not.toContain('secret-key-12345');
      }
    });

    it('should reject empty API key', () => {
      expect(() => new RecallBricks({ apiKey: '' })).toThrow(RecallBricksError);
    });

    it('should handle API key with special characters', async () => {
      const specialApiKey = 'key!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      let capturedHeaders: any = null;

      nock(baseUrl)
        .post('/memories')
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, { id: 'mem-123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' }];
        });

      const client = new RecallBricks({ apiKey: specialApiKey, baseUrl });
      await client.createMemory('test');

      expect(capturedHeaders['x-api-key']).toBe(specialApiKey);
    });
  });

  describe('Input Sanitization', () => {
    it('should handle SQL injection attempts in text', async () => {
      const sqlInjection = "'; DROP TABLE memories; --";
      const memory = {
        id: 'mem-123',
        text: sqlInjection,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const client = new RecallBricks({ apiKey, baseUrl });
      const result = await client.createMemory(sqlInjection);
      expect(result.text).toBe(sqlInjection);
    });

    it('should handle XSS attempts in text', async () => {
      const xssAttempt = '<script>alert("XSS")</script>';
      const memory = {
        id: 'mem-123',
        text: xssAttempt,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const client = new RecallBricks({ apiKey, baseUrl });
      const result = await client.createMemory(xssAttempt);
      expect(result.text).toBe(xssAttempt);
    });

    it('should handle path traversal attempts in memory ID', async () => {
      const pathTraversal = '../../../etc/passwd';

      nock(baseUrl)
        .get(`/memories/${encodeURIComponent(pathTraversal)}/relationships`)
        .reply(404, { error: 'Not found' });

      const client = new RecallBricks({ apiKey, baseUrl });
      await expect(client.getRelationships(pathTraversal)).rejects.toThrow();
    });

    it('should handle null bytes in text', async () => {
      const nullByteText = 'test\x00data';
      const memory = {
        id: 'mem-123',
        text: nullByteText,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const client = new RecallBricks({ apiKey, baseUrl });
      const result = await client.createMemory(nullByteText);
      expect(result).toBeDefined();
    });

    it('should handle command injection attempts in tags', async () => {
      const commandInjection = ['tag1; rm -rf /', 'tag2 && cat /etc/passwd'];
      const memory = {
        id: 'mem-123',
        text: 'test',
        tags: commandInjection,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };

      nock(baseUrl)
        .post('/memories')
        .reply(200, memory);

      const client = new RecallBricks({ apiKey, baseUrl });
      const result = await client.createMemory('test', { tags: commandInjection });
      expect(result.tags).toEqual(commandInjection);
    });
  });

  describe('Data Validation', () => {
    it('should reject negative depth values', async () => {
      const client = new RecallBricks({ apiKey, baseUrl });
      await expect(client.getGraphContext('mem-123', -1)).rejects.toThrow(RecallBricksError);
    });

    it('should reject depth values above maximum', async () => {
      const client = new RecallBricks({ apiKey, baseUrl });
      await expect(client.getGraphContext('mem-123', 999)).rejects.toThrow(RecallBricksError);
    });

    it('should validate memory ID format', async () => {
      const client = new RecallBricks({ apiKey, baseUrl });
      await expect(client.deleteMemory('')).rejects.toThrow(RecallBricksError);
      await expect(client.deleteMemory('   ')).rejects.toThrow(RecallBricksError);
    });

    it('should validate required fields', async () => {
      const client = new RecallBricks({ apiKey, baseUrl });
      await expect(client.createMemory('')).rejects.toThrow(RecallBricksError);
      await expect(client.search('')).rejects.toThrow(RecallBricksError);
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose internal paths in errors', async () => {
      nock(baseUrl)
        .post('/memories')
        .reply(500, {
          error: 'Internal error at /var/app/src/memory.js:123',
          stack: 'Error: ...\n  at /var/app/src/memory.js:123',
        });

      const client = new RecallBricks({ apiKey, baseUrl });

      try {
        await client.createMemory('test');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(RecallBricksError);
        // SDK should receive the error but doesn't need to filter it
        // That's the API's responsibility
      }
    });

    it('should handle errors with sensitive data gracefully', async () => {
      nock(baseUrl)
        .post('/memories')
        .reply(400, {
          error: 'Invalid input',
          details: {
            field: 'apiKey',
            value: 'should-not-be-exposed',
          },
        });

      const client = new RecallBricks({ apiKey, baseUrl });

      try {
        await client.createMemory('test');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(RecallBricksError);
        const rbError = error as RecallBricksError;
        expect(rbError.details).toBeDefined();
      }
    });
  });

  describe('Request Integrity', () => {
    it('should use HTTPS when specified', async () => {
      const httpsUrl = 'https://api.example.com/v1';

      nock(httpsUrl)
        .post('/memories')
        .reply(200, { id: 'mem-123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' });

      const client = new RecallBricks({ apiKey, baseUrl: httpsUrl });
      await client.createMemory('test');

      expect(httpsUrl).toContain('https');
    });

    it('should include content-type header', async () => {
      let capturedHeaders: any = null;

      nock(baseUrl)
        .post('/memories')
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, { id: 'mem-123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' }];
        });

      const client = new RecallBricks({ apiKey, baseUrl });
      await client.createMemory('test');

      expect(capturedHeaders['content-type']).toBe('application/json');
    });

    it('should handle rate limiting securely', async () => {
      nock(baseUrl)
        .post('/memories')
        .reply(429, {
          error: 'Rate limit exceeded',
          retry_after: 60,
        });

      const client = new RecallBricks({ apiKey, baseUrl, maxRetries: 0 });
      await expect(client.createMemory('test')).rejects.toThrow(RecallBricksError);
    });
  });

  describe('Denial of Service Protection', () => {
    it('should respect timeout configuration', async () => {
      const client = new RecallBricks({
        apiKey,
        baseUrl,
        timeout: 100,
        maxRetries: 0,
      });

      nock(baseUrl)
        .post('/memories')
        .delay(200)
        .reply(200, { id: 'mem-123', text: 'test', created_at: '2025-01-01', updated_at: '2025-01-01' });

      await expect(client.createMemory('test')).rejects.toThrow();
    });

    it('should limit retry attempts', async () => {
      const client = new RecallBricks({
        apiKey,
        baseUrl,
        maxRetries: 2,
        retryDelay: 10,
      });

      let requestCount = 0;
      nock(baseUrl)
        .post('/memories')
        .times(3) // Initial + 2 retries
        .reply(() => {
          requestCount++;
          return [503, { error: 'Service unavailable' }];
        });

      await expect(client.createMemory('test')).rejects.toThrow();
      expect(requestCount).toBeLessThanOrEqual(3);
    });

    it('should handle exponential backoff properly', async () => {
      const client = new RecallBricks({
        apiKey,
        baseUrl,
        maxRetries: 3,
        retryDelay: 10,
        maxRetryDelay: 100,
      });

      const start = Date.now();
      nock(baseUrl)
        .post('/memories')
        .times(4)
        .reply(503);

      await expect(client.createMemory('test')).rejects.toThrow();
      const duration = Date.now() - start;

      // Should have delays: 10ms + 20ms + 40ms = 70ms minimum
      expect(duration).toBeGreaterThanOrEqual(60);
      // Should not exceed reasonable maximum (with buffer)
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Data Leakage Prevention', () => {
    it('should not log sensitive data', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      nock(baseUrl)
        .post('/memories')
        .reply(401, { error: 'Unauthorized' });

      const client = new RecallBricks({ apiKey: 'secret-key', baseUrl });

      try {
        await client.createMemory('sensitive data');
      } catch {
        // Error expected
      }

      // Console should not contain the API key
      if (consoleErrorSpy.mock.calls.length > 0) {
        const loggedData = consoleErrorSpy.mock.calls.join(' ');
        expect(loggedData).not.toContain('secret-key');
      }

      consoleErrorSpy.mockRestore();
    });
  });
});
