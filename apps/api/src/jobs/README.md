# Background Job Processing with BullMQ

This directory contains the background job processing infrastructure built with BullMQ.

## Overview

The job system provides asynchronous processing for:
- **Email sending** - Queue emails to avoid blocking API requests
- **Notifications** - Process in-app notifications and real-time updates
- **Report generation** - Generate reports asynchronously
- **Data cleanup** - Scheduled cleanup tasks for expired data

## Architecture

```
jobs/
├── queue.ts                 # Queue configuration and initialization
├── worker.ts                # Worker process entry point
├── processors/              # Job processors
│   ├── email-processor.ts
│   ├── notification-processor.ts
│   ├── report-processor.ts
│   └── cleanup-processor.ts
└── README.md
```

## Environment Variables

Add these to your `.env` file:

```bash
# Redis connection (required)
REDIS_URL=redis://localhost:6379
# Or individual settings:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Usage

### Starting the Worker

Development:
```bash
pnpm --filter api worker:dev
```

Production:
```bash
pnpm --filter api build
pnpm --filter api start:worker
```

### Queue an Email

```typescript
import { jobService } from './services/job-service';

// Queue email for background processing
await jobService.addEmailJob({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<p>Welcome to our platform</p>',
  type: 'welcome',
  organizationId: 'org-123',
});
```

### Using Updated Email Service

```typescript
import { emailService } from './services/email-service';

// Send email immediately (default)
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Critical Alert',
  html: '<p>Important message</p>',
});

// Queue email for background processing
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Newsletter',
  html: '<p>Monthly newsletter</p>',
  queue: true, // Add this flag to queue
});
```

### Add Notification

```typescript
await jobService.addNotificationJob({
  userId: 'user-123',
  title: 'New Message',
  message: 'You have a new message',
  type: 'info',
  organizationId: 'org-123',
});
```

### Generate Report

```typescript
await jobService.addReportJob({
  reportType: 'audit-log',
  organizationId: 'org-123',
  dateRange: {
    from: new Date('2024-01-01'),
    to: new Date('2024-12-31'),
  },
  format: 'pdf',
  recipientEmail: 'admin@example.com',
});
```

### Schedule Cleanup

```typescript
// Schedule daily cleanup at 2 AM
await jobService.scheduleCleanup(
  'expired-tokens',
  '0 2 * * *'
);
```

### Check Job Status

```typescript
const status = await jobService.getJobStatus('job-id', 'email');
console.log(status);
// {
//   id: 'job-id',
//   state: 'completed',
//   progress: 100,
//   attemptsMade: 1,
//   finishedOn: 1704067200000,
//   data: { ... }
// }
```

## Retry Logic

All jobs have automatic retry with exponential backoff:
- **Max Attempts:** 3
- **Backoff:** Exponential starting at 2 seconds
- **Example:** 1st retry after 2s, 2nd after 4s, 3rd after 8s

## Job Retention

- **Completed jobs:** Kept for 24 hours (last 1000)
- **Failed jobs:** Kept for 7 days (last 5000)

## Queue Priorities

1. **Notifications** - Priority 1 (highest)
2. **Emails** - Priority 2 (high, OTP/password reset = 1)
3. **Reports** - Priority 5 (normal)
4. **Cleanup** - Priority 10 (lowest)

## Monitoring

### Queue Health Check

```typescript
import { checkQueuesHealth } from './jobs/queue';

const health = await checkQueuesHealth();
console.log(health);
// {
//   healthy: true,
//   queues: {
//     email: { connected: true },
//     notification: { connected: true },
//     report: { connected: true },
//     cleanup: { connected: true }
//   }
// }
```

### Queue Statistics

```typescript
const stats = await jobService.getQueueStats('email');
console.log(stats);
// {
//   waiting: 5,
//   active: 2,
//   completed: 150,
//   failed: 3,
//   delayed: 0
// }
```

## Worker Concurrency

- **Email:** 5 concurrent jobs
- **Notification:** 10 concurrent jobs
- **Report:** 2 concurrent jobs (CPU intensive)
- **Cleanup:** 1 concurrent job (DB intensive)

## Graceful Shutdown

The worker handles shutdown signals gracefully:
- `SIGTERM` - Kubernetes/Docker shutdown
- `SIGINT` - Ctrl+C
- Completes active jobs before shutting down
- Closes all Redis connections properly

## Production Deployment

### Docker Compose

```yaml
services:
  api:
    build: ./apps/api
    command: npm start
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - postgres

  worker:
    build: ./apps/api
    command: npm run start:worker
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Scaling Workers

You can run multiple worker processes for high throughput:

```bash
# Terminal 1
pnpm --filter api worker

# Terminal 2
pnpm --filter api worker

# Terminal 3
pnpm --filter api worker
```

BullMQ automatically distributes jobs across workers.

## Future Enhancements

- [ ] Add BullMQ Board UI for job monitoring
- [ ] Implement job progress tracking
- [ ] Add email attachment support for reports
- [ ] Implement SMS notifications via cleanup processor
- [ ] Add metrics export (Prometheus)
- [ ] Implement dead letter queue for permanently failed jobs
