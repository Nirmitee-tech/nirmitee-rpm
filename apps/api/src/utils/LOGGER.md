# Structured Logger

Production-ready Winston logger for NirmiteeRPM API.

## Features

- **Structured logging** with JSON format in production
- **Pretty-print** for development
- **Log levels**: debug, info, warn, error
- **Request ID tracking** for request correlation
- **Automatic log rotation** in production (file-based)
- **Environment-aware** configuration

## Usage

### Basic Logging

```typescript
import { log } from '../utils/logger';

// Info logging
log.info('User logged in', { userId: '123', email: 'user@example.com' });

// Warning logging
log.warn('Rate limit approaching', { remainingRequests: 5 });

// Error logging
log.error('Database connection failed', error, {
  database: 'postgres',
  retryAttempt: 3
});

// Debug logging (only in development or when LOG_LEVEL=debug)
log.debug('Cache hit', { key: 'user:123', ttl: 300 });
```

### Request Logger (with Request ID)

For HTTP request handlers with correlation tracking:

```typescript
import { createRequestLogger } from '../utils/logger';

export function myMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestLogger = createRequestLogger(req.requestId);

  requestLogger.info('Processing request', {
    method: req.method,
    path: req.path,
    userId: req.user?.id,
  });

  // Logs will include [req:abc-123] for correlation
  next();
}
```

### Default Logger

Direct access to the Winston logger instance:

```typescript
import logger from '../utils/logger';

logger.info('Server starting');
logger.error('Failed to connect', { error: err.message });
```

## Log Levels

| Level   | Usage                                           | Environment        |
|---------|------------------------------------------------|---------------------|
| `debug` | Detailed debugging information                 | Development only    |
| `info`  | General informational messages                 | All environments    |
| `warn`  | Warning messages (non-critical issues)         | All environments    |
| `error` | Error messages (failures, exceptions)          | All environments    |

## Environment Variables

```bash
# Set log level (default: info in production, debug in development)
LOG_LEVEL=debug

# Node environment
NODE_ENV=production
```

## Output Formats

### Development (Pretty Print)

```
2026-01-07 13:50:41 [info] [api]: User logged in {
  "userId": "123",
  "email": "user@example.com"
}
```

### Production (JSON)

```json
{
  "timestamp": "2026-01-07T13:50:41.123Z",
  "level": "info",
  "message": "User logged in",
  "service": "api",
  "userId": "123",
  "email": "user@example.com"
}
```

## Log Files (Production)

Logs are automatically written to files in production:

- `logs/error.log` - Error logs only (max 10MB, 5 files rotated)
- `logs/combined.log` - All logs (max 10MB, 10 files rotated)

## Best Practices

### ✅ DO

```typescript
// Use structured metadata
log.info('Payment processed', {
  orderId: '123',
  amount: 99.99,
  currency: 'USD'
});

// Log errors with context
log.error('Failed to send email', error, {
  recipient: 'user@example.com',
  template: 'welcome'
});

// Use appropriate log levels
log.debug('Cache lookup', { key: 'user:123' });  // Not needed in prod
log.error('Database query failed', error);        // Critical issue
```

### ❌ DON'T

```typescript
// Don't use console.log
console.log('User logged in');  // ❌

// Don't log sensitive data
log.info('User authenticated', {
  password: 'secret123'  // ❌ NEVER log passwords
});

// Don't concatenate strings
log.info('User ' + userId + ' logged in');  // ❌ Use metadata instead
```

## Migration from console.log

All `console.log`, `console.error`, `console.warn` calls have been replaced with structured logging:

```diff
- console.log('User logged in:', userId);
+ log.info('User logged in', { userId });

- console.error('Error:', error);
+ log.error('Operation failed', error);

- console.warn('Deprecated API', endpoint);
+ log.warn('Deprecated API usage', { endpoint });
```

## Performance

- Logging is asynchronous and non-blocking
- Minimal performance impact in production
- File writes are buffered and batched
- Debug logs can be disabled in production

## Troubleshooting

### Logs not appearing?

Check `LOG_LEVEL` environment variable:

```bash
LOG_LEVEL=debug npm run dev
```

### File permission errors?

Ensure `logs/` directory is writable:

```bash
mkdir -p logs
chmod 755 logs
```

### Too verbose?

Set log level to `warn` or `error`:

```bash
LOG_LEVEL=warn npm start
```
