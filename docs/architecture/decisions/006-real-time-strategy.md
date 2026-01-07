# ADR-006: Real-Time Communication with Socket.io

## Status
Accepted

## Context
Healthcare RPM platform requires real-time features:
- Live vital signs updates to clinician dashboards
- Critical alert notifications
- Activity feed updates
- User presence indicators
- Care plan change notifications
- System notifications

Requirements:
- Low latency (sub-second updates)
- Reliable message delivery
- Room-based broadcasting (organization-scoped)
- Authentication integration
- Fallback for poor network conditions
- Works across web and mobile clients

## Decision
Use **Socket.io** for real-time bidirectional communication between clients and server.

### Architecture
```
Client (Web/Mobile)
    ↕ Socket.io
WebSocket Server (Socket.io)
    ↕
Redis (PubSub for multi-instance scaling)
    ↕
Application Services
```

### Implementation
```typescript
// apps/api/src/services/websocket-service.ts
const io = new Server(httpServer, {
  cors: { origin: process.env.WEB_URL }
})

io.use(authenticateSocket)  // JWT authentication

io.on('connection', (socket) => {
  socket.join(`org:${socket.user.organizationId}`)
  socket.join(`user:${socket.user.userId}`)
})
```

## Consequences

### Positive
- **Automatic fallback**: Degrades to long-polling if WebSocket unavailable
- **Room support**: Easy org-scoped broadcasting
- **Authentication**: Integrates with JWT tokens
- **Reconnection**: Built-in reconnection logic
- **Binary support**: Can send binary data (future: device data streams)
- **Cross-platform**: Works on web, iOS, Android
- **Mature library**: Well-tested, large community
- **Redis adapter**: Scales across multiple server instances

### Negative
- **Connection overhead**: Each client maintains persistent connection
- **Stateful**: Requires sticky sessions or Redis for multi-instance
- **Complexity**: More complex than REST or polling
- **Debugging**: Harder to debug than HTTP requests
- **Monitoring**: Need specialized tooling for WebSocket metrics
- **Mobile battery**: Persistent connections drain battery

## Alternatives Considered

### 1. Server-Sent Events (SSE)
- Unidirectional server-to-client
- **Rejected**: No client-to-server messaging, limited browser support

### 2. Long Polling
- HTTP-based pseudo-real-time
- **Rejected**: High latency, server resource intensive, complex to implement correctly

### 3. WebSockets (raw)
- Native WebSocket API
- **Rejected**: Need to implement reconnection, fallbacks, room management ourselves

### 4. GraphQL Subscriptions
- Real-time via GraphQL
- **Rejected**: Don't use GraphQL elsewhere, adds complexity

### 5. Firebase Realtime Database
- Managed real-time database
- **Rejected**: Vendor lock-in, data stored outside our control, HIPAA concerns

### 6. Pusher/Ably (managed services)
- Third-party real-time services
- **Rejected**: Cost at scale, data privacy concerns for healthcare

## Use Cases

### 1. Vital Signs Updates
```typescript
// Server broadcasts new vital reading
io.to(`org:${organizationId}`).emit('vital:new', {
  patientId,
  type: 'BLOOD_PRESSURE',
  values: { systolic: 140, diastolic: 90 }
})

// Client listens
socket.on('vital:new', (data) => {
  updateDashboard(data)
})
```

### 2. Critical Alerts
```typescript
// Broadcast to specific clinician
io.to(`user:${clinicianId}`).emit('alert:critical', {
  alertId,
  severity: 'CRITICAL',
  message: 'Patient BP critically high'
})
```

### 3. Notifications
```typescript
// User-specific notifications
io.to(`user:${userId}`).emit('notification', {
  type: 'TEAM_INVITE',
  message: 'You were added to Team Alpha'
})
```

### 4. Activity Feed
```typescript
// Organization activity
io.to(`org:${organizationId}`).emit('activity', {
  action: 'created',
  entityType: 'patient',
  actorName: 'Dr. Smith'
})
```

## Security

### Authentication
```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  try {
    const user = verifyJWT(token)
    socket.user = user
    next()
  } catch (err) {
    next(new Error('Authentication failed'))
  }
})
```

### Authorization
- Clients auto-join their organization room
- Server validates permissions before emitting
- Room names scoped by organizationId

### Data Validation
- Validate all incoming messages
- Sanitize data before broadcasting
- Rate limit socket messages

## Scaling

### Single Instance
Direct communication via Socket.io events

### Multiple Instances
Use Redis adapter for pub/sub:
```typescript
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ url: process.env.REDIS_URL })
const subClient = pubClient.duplicate()

io.adapter(createAdapter(pubClient, subClient))
```

Benefits:
- Events broadcast across all server instances
- Clients can connect to any instance
- No need for sticky sessions

## Client Implementation

### Web Client
```typescript
// apps/web/lib/socket.ts
import io from 'socket.io-client'

const socket = io(process.env.NEXT_PUBLIC_API_URL, {
  auth: { token: getAccessToken() },
  autoConnect: false
})

socket.connect()

socket.on('vital:new', (data) => {
  // Update UI
})
```

### React Hook
```typescript
function useVitalUpdates(patientId: string) {
  useEffect(() => {
    socket.on('vital:new', (data) => {
      if (data.patientId === patientId) {
        setVital(data)
      }
    })

    return () => socket.off('vital:new')
  }, [patientId])
}
```

## Performance Considerations

### Connection Pooling
- Limit concurrent connections per server
- Monitor connection count
- Implement backpressure if needed

### Message Batching
- Batch frequent updates (e.g., vital signs)
- Debounce non-critical updates
- Compress large payloads

### Room Management
- Auto-cleanup empty rooms
- Limit room size for large broadcasts
- Use namespaces for logical separation

## Monitoring

### Metrics
- Active connections
- Messages per second
- Reconnection rate
- Error rate
- Latency (client to server to client)

### Logging
```typescript
socket.on('error', (err) => {
  logger.error('Socket error', { userId: socket.user.id, error: err })
})

io.on('connection', (socket) => {
  logger.info('Client connected', { userId: socket.user.id })
})
```

## Fallback Strategy

### Network Issues
- Socket.io auto-reconnects with exponential backoff
- Client shows "connecting..." indicator
- Queue messages during disconnect (within limits)

### WebSocket Blocked
- Automatic fallback to HTTP long-polling
- Transparent to application code

### Server Unavailable
- Client displays offline mode
- Poll REST API as fallback
- Sync when connection restored

## Testing

### Unit Tests
```typescript
import { createServer } from 'http'
import { Server } from 'socket.io'
import Client from 'socket.io-client'

describe('WebSocket', () => {
  let io, clientSocket

  beforeEach(() => {
    const httpServer = createServer()
    io = new Server(httpServer)
    httpServer.listen()

    clientSocket = Client(`http://localhost:${port}`, {
      auth: { token: validToken }
    })
  })

  it('broadcasts vital sign updates', (done) => {
    clientSocket.on('vital:new', (data) => {
      expect(data.type).toBe('BLOOD_PRESSURE')
      done()
    })

    io.to('org:123').emit('vital:new', { ... })
  })
})
```

### Integration Tests
- Test multi-instance pub/sub with Redis
- Verify authentication flow
- Test reconnection scenarios
- Load test with 1000+ concurrent connections

## Related
- ADR-002: JWT authentication (used for socket auth)
- ADR-003: Multi-tenancy (room scoping by organizationId)
- Notification system documentation
- Real-time dashboard implementation
