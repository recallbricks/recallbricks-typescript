# RecallBricks SDK Troubleshooting

Common errors and solutions for the RecallBricks TypeScript SDK.

## Table of Contents

- [Authentication Errors](#authentication-errors)
- [Network Errors](#network-errors)
- [Input Validation Errors](#input-validation-errors)
- [Memory Not Found](#memory-not-found)
- [Rate Limiting](#rate-limiting)
- [TypeScript Errors](#typescript-errors)
- [Autonomous Feature Errors](#autonomous-feature-errors)
- [Debugging Tips](#debugging-tips)

---

## Authentication Errors

### MISSING_AUTH: Neither apiKey nor serviceToken provided

**Error:**
```
RecallBricksError: Either apiKey or serviceToken must be provided
Code: MISSING_AUTH
```

**Cause:** The client was initialized without any authentication credentials.

**Solution:**
```typescript
// Provide either apiKey
const client = new RecallBricks({
  apiKey: process.env.RECALLBRICKS_API_KEY,
});

// Or serviceToken (for server-to-server auth)
const client = new RecallBricks({
  serviceToken: process.env.RECALLBRICKS_SERVICE_TOKEN,
});
```

---

### INVALID_AUTH_CONFIG: Both apiKey and serviceToken provided

**Error:**
```
RecallBricksError: Cannot use both apiKey and serviceToken. Choose one authentication method.
Code: INVALID_AUTH_CONFIG
```

**Cause:** The client was initialized with both authentication methods.

**Solution:**
```typescript
// Use only one authentication method
const client = new RecallBricks({
  apiKey: process.env.RECALLBRICKS_API_KEY,
  // Don't include serviceToken when using apiKey
});
```

---

### MISSING_USER_ID: userId required with service token

**Error:**
```
RecallBricksError: userId is required when using service token authentication
Code: MISSING_USER_ID
```

**Cause:** When using a service token, `userId` must be provided for user-scoped operations.

**Solution:**
```typescript
const client = new RecallBricks({
  serviceToken: process.env.RECALLBRICKS_SERVICE_TOKEN,
});

// Always include userId with service token
const memory = await client.createMemory('Memory text', {
  userId: 'user-123',  // Required!
});

const results = await client.search('query', {
  userId: 'user-123',  // Required!
});
```

---

### 401 Unauthorized

**Error:**
```
RecallBricksError: Unauthorized
statusCode: 401
```

**Cause:** Invalid or expired API key/service token.

**Solutions:**

1. Verify your API key is correct:
```typescript
console.log('API Key starts with:', process.env.RECALLBRICKS_API_KEY?.substring(0, 8));
```

2. Check for extra whitespace:
```typescript
const client = new RecallBricks({
  apiKey: process.env.RECALLBRICKS_API_KEY?.trim(),
});
```

3. Regenerate your API key from the RecallBricks dashboard.

---

## Network Errors

### NO_RESPONSE: No response received from server

**Error:**
```
RecallBricksError: No response received from server
Code: NO_RESPONSE
```

**Causes:**
- Server is unreachable
- Network connectivity issues
- Incorrect `baseUrl`
- Firewall blocking the connection

**Solutions:**

1. Verify the server is running:
```bash
curl http://localhost:10002/api/v1/health
```

2. Check your `baseUrl`:
```typescript
const client = new RecallBricks({
  apiKey: process.env.RECALLBRICKS_API_KEY,
  baseUrl: 'http://localhost:10002/api/v1',  // Verify this is correct
});
```

3. Increase timeout for slow connections:
```typescript
const client = new RecallBricks({
  apiKey: process.env.RECALLBRICKS_API_KEY,
  timeout: 60000,  // 60 seconds
});
```

---

### Connection Timeout

**Error:**
```
RecallBricksError: timeout of 30000ms exceeded
```

**Cause:** The request took too long to complete.

**Solutions:**

1. Increase the timeout:
```typescript
const client = new RecallBricks({
  apiKey: process.env.RECALLBRICKS_API_KEY,
  timeout: 60000,  // 60 seconds
});
```

2. Check network latency to the server.

3. Consider breaking large operations into smaller batches.

---

### Retry Exhausted

**Error:**
```
RecallBricksError: Request failed after retries
```

**Cause:** The request failed after all retry attempts.

**Solutions:**

1. Increase retry attempts:
```typescript
const client = new RecallBricks({
  apiKey: process.env.RECALLBRICKS_API_KEY,
  maxRetries: 5,      // Default is 3
  retryDelay: 2000,   // Start with 2 second delay
  maxRetryDelay: 30000,  // Max 30 seconds between retries
});
```

2. Check server health and logs.

---

## Input Validation Errors

### INVALID_INPUT: Text is required

**Error:**
```
RecallBricksError: Text is required
statusCode: 400
Code: INVALID_INPUT
```

**Cause:** Empty or missing text for `createMemory`.

**Solution:**
```typescript
// Ensure text is not empty
const text = 'User prefers dark mode';
if (text.trim()) {
  const memory = await client.createMemory(text);
}
```

---

### INVALID_INPUT: Query is required

**Error:**
```
RecallBricksError: Query is required
statusCode: 400
Code: INVALID_INPUT
```

**Cause:** Empty or missing query for `search`.

**Solution:**
```typescript
const query = 'user preferences';
if (query.trim()) {
  const results = await client.search(query);
}
```

---

### INVALID_INPUT: Memory ID is required

**Error:**
```
RecallBricksError: Memory ID is required
statusCode: 400
Code: INVALID_INPUT
```

**Cause:** Missing or empty memory ID.

**Solution:**
```typescript
// Ensure you have a valid memory ID
if (memoryId) {
  const memory = await client.updateMemory(memoryId, { text: 'Updated' });
}
```

---

### INVALID_INPUT: Depth must be between 1 and 10

**Error:**
```
RecallBricksError: Depth must be between 1 and 10
statusCode: 400
Code: INVALID_INPUT
```

**Cause:** Invalid depth value for `getGraphContext`.

**Solution:**
```typescript
// Use a depth between 1 and 10
const graph = await client.getGraphContext(memoryId, 3);  // Valid: 1-10
```

---

## Memory Not Found

### 404 Not Found

**Error:**
```
RecallBricksError: Memory not found
statusCode: 404
```

**Causes:**
- The memory ID doesn't exist
- The memory was deleted
- The memory belongs to a different user (when using service tokens)

**Solutions:**

1. Verify the memory exists:
```typescript
try {
  const relationships = await client.getRelationships(memoryId);
} catch (error) {
  if (error.statusCode === 404) {
    console.log('Memory does not exist:', memoryId);
  }
}
```

2. When using service tokens, ensure you're querying the correct user's memories:
```typescript
const results = await client.listMemories({
  userId: 'user-123',  // Correct user ID
  limit: 100,
});
```

---

## Rate Limiting

### 429 Too Many Requests

**Error:**
```
RecallBricksError: Too many requests
statusCode: 429
```

**Cause:** You've exceeded the API rate limit.

**Solutions:**

1. The SDK automatically retries 429 errors with exponential backoff. Increase retry settings:
```typescript
const client = new RecallBricks({
  apiKey: process.env.RECALLBRICKS_API_KEY,
  maxRetries: 5,
  retryDelay: 2000,
  maxRetryDelay: 30000,
});
```

2. Implement request queuing in your application.

3. Contact support to increase your rate limits.

---

## TypeScript Errors

### Module not found

**Error:**
```
Cannot find module 'recallbricks' or its corresponding type declarations
```

**Solutions:**

1. Install the package:
```bash
npm install recallbricks@2.1.0
```

2. Ensure `node_modules` is not in `.gitignore` path issues.

3. Restart your TypeScript server in your IDE.

---

### Type 'X' is not assignable to type 'Y'

**Cause:** Type mismatch in your code.

**Solution:** Import and use the correct types:
```typescript
import {
  Memory,
  MemoryMetadata,
  CreateMemoryOptions,
  SearchOptions,
  RecallBricksError,
} from 'recallbricks';

const options: CreateMemoryOptions = {
  tags: ['preference'],
  metadata: {
    userId: 'user-123',
    score: 0.95,  // number is allowed
    active: true, // boolean is allowed
  },
};
```

---

### Property 'X' does not exist on type 'RecallBricks'

**Cause:** Using a method or property that doesn't exist.

**Solution:** Check the API reference for available methods. For autonomous features:
```typescript
// Correct property names
client.workingMemory    // Not client.working_memory
client.prospectiveMemory // Not client.prospective_memory
client.hybridSearch      // Not client.search (search is a method)
```

---

## Autonomous Feature Errors

### 404 on Autonomous Endpoints

**Error:**
```
RecallBricksError: Not Found
statusCode: 404
```

**Cause:** Your RecallBricks backend doesn't support autonomous features.

**Solution:**

1. Check if your backend supports autonomous features:
```typescript
try {
  const session = await client.workingMemory.createSession({
    namespace: 'test',
    capacity: 5,
  });
} catch (error) {
  if (error.statusCode === 404) {
    console.log('Autonomous features not supported by backend');
  }
}
```

2. Update your RecallBricks backend to a version that supports autonomous features.

---

### Session/Goal Not Found

**Error:**
```
RecallBricksError: Session not found
statusCode: 404
```

**Cause:** The working memory session or goal doesn't exist.

**Solution:**
```typescript
// Create a new session if not found
let session;
try {
  session = await client.workingMemory.getSession(sessionId, 'my-namespace');
} catch (error) {
  if (error.statusCode === 404) {
    session = await client.workingMemory.createSession({
      namespace: 'my-namespace',
      capacity: 7,
    });
  }
}
```

---

## Debugging Tips

### Enable Request Logging

Log all requests and responses:

```typescript
import axios from 'axios';

// Add interceptor before creating client
axios.interceptors.request.use(request => {
  console.log('Request:', request.method?.toUpperCase(), request.url);
  console.log('Data:', JSON.stringify(request.data, null, 2));
  return request;
});

axios.interceptors.response.use(
  response => {
    console.log('Response:', response.status);
    return response;
  },
  error => {
    console.log('Error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);
```

### Check Error Details

Always inspect the full error object:

```typescript
try {
  await client.createMemory('test');
} catch (error) {
  if (error instanceof RecallBricksError) {
    console.log('Message:', error.message);
    console.log('Status Code:', error.statusCode);
    console.log('Error Code:', error.code);
    console.log('Details:', JSON.stringify(error.details, null, 2));
    console.log('Stack:', error.stack);
  }
}
```

### Test Connection

Verify basic connectivity:

```typescript
async function testConnection() {
  const client = new RecallBricks({
    apiKey: process.env.RECALLBRICKS_API_KEY,
  });

  try {
    // Try a simple list operation
    const result = await client.listMemories({ limit: 1 });
    console.log('Connection successful!');
    console.log('Total memories:', result.total);
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}
```

---

## Getting Help

If you're still having issues:

1. Check the [API Reference](./api-reference.md) for correct usage
2. Review [Examples](./examples.md) for working code
3. Open an issue on GitHub with:
   - SDK version (`npm list recallbricks`)
   - Node.js version (`node --version`)
   - Full error message and stack trace
   - Minimal code to reproduce the issue
