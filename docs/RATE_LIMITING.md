# Rate Limiting Documentation

## Overview

ClearHold implements comprehensive rate limiting to protect the platform from abuse, ensure fair usage, and maintain service availability. Rate limiting is applied at multiple levels: middleware (server-side) and client-side with visual feedback.

## Rate Limits by Endpoint

### KYC Endpoints

| Endpoint | Limit | Window | Description |
|----------|-------|---------|-------------|
| `/kyc` | 30 requests | 1 minute | General KYC page access |
| `/kyc/personal` | 10 requests | 1 minute | Personal information form |
| `/kyc/documents` | 5 requests | 1 minute | Document upload endpoint |
| `/kyc/verification` | 5 requests | 1 minute | Verification submission |
| `/api/kyc/*` | 20 requests | 1 minute | KYC API endpoints |

### Other Endpoints

| Operation | Limit | Window | Description |
|-----------|-------|---------|-------------|
| Login attempts | 5 attempts | 15 minutes | Authentication attempts |
| Password reset | 3 requests | 1 hour | Password reset requests |
| Transaction creation | 10 requests | 1 hour | Creating new transactions |
| File uploads | 20 uploads | 1 hour | Document uploads |
| API requests (general) | 100 requests | 15 minutes | General API calls |
| Contact invitations | 10 invites | 24 hours | Sending contact invitations |
| Wallet operations | 20 operations | 1 hour | Wallet-related actions |

## Response Headers

### Successful Requests

When a request is successful, the following headers are included:

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 2024-01-20T10:30:00.000Z
X-RateLimit-Policy: sliding-window
```

### Rate Limited Requests (429)

When rate limited, the response includes:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 45
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-01-20T10:30:00.000Z

{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please retry after 45 seconds.",
  "retryAfter": 45
}
```

## Client-Side Implementation

### Using the Rate Limiter

```typescript
import { useClientRateLimit } from '@/lib/utils/rate-limiter';

function MyComponent() {
  const {
    isRateLimited,
    rateLimitInfo,
    checkLimit,
    recordRequest,
    handleError,
    getRemainingRequests
  } = useClientRateLimit('/api/kyc/verify', {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
    onRateLimited: (info) => {
      console.log('Rate limited:', info);
    },
    onRecovered: () => {
      console.log('Rate limit recovered');
    }
  });

  const makeRequest = async () => {
    // Check if we can make a request
    const allowed = await checkLimit();
    if (!allowed) {
      // Handle rate limit
      return;
    }

    try {
      const response = await fetch('/api/kyc/verify', {
        method: 'POST',
        // ... request options
      });

      // Record the request with headers
      recordRequest({
        'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
        'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
        'x-ratelimit-reset': response.headers.get('x-ratelimit-reset'),
      });

      // Handle response
    } catch (error) {
      if (error.response?.status === 429) {
        handleError(error.response.headers.get('retry-after'));
      }
    }
  };

  return (
    <div>
      <p>Remaining requests: {getRemainingRequests()}</p>
      {isRateLimited && (
        <p>Rate limited. Retry at: {rateLimitInfo?.reset.toLocaleTimeString()}</p>
      )}
    </div>
  );
}
```

### Visual Indicators

#### Basic Rate Limit Indicator

```tsx
import { RateLimitIndicator } from '@/components/kyc/rate-limit-indicator';

<RateLimitIndicator
  endpoint="/api/kyc/verify"
  maxRequests={5}
  windowMs={60000}
  showDetails={true}
  onRateLimited={(info) => console.log('Rate limited:', info)}
/>
```

#### Floating Indicator

```tsx
import { FloatingRateLimitIndicator } from '@/components/kyc/rate-limit-indicator';

// Shows automatically when approaching limit
<FloatingRateLimitIndicator
  endpoint="/api/kyc/verify"
  maxRequests={5}
  windowMs={60000}
  threshold={0.8} // Show when 80% of limit used
/>
```

#### Monitoring Dashboard

```tsx
import { RateLimitMonitor } from '@/components/kyc/rate-limit-indicator';

<RateLimitMonitor
  endpoints={[
    {
      name: 'KYC Verification',
      endpoint: '/api/kyc/verify',
      maxRequests: 5,
      windowMs: 60000
    },
    {
      name: 'Document Upload',
      endpoint: '/api/kyc/documents',
      maxRequests: 10,
      windowMs: 60000
    }
  ]}
/>
```

## Handling Rate Limits

### Best Practices

1. **Check Before Request**: Always check rate limits before making requests
2. **Handle 429 Gracefully**: Implement proper error handling for rate limit responses
3. **Use Exponential Backoff**: When retrying, increase delay between attempts
4. **Show Visual Feedback**: Keep users informed about rate limit status
5. **Cache When Possible**: Reduce unnecessary API calls through caching

### Exponential Backoff Example

```typescript
import { createRateLimitedClient } from '@/lib/utils/rate-limiter';

const rateLimitedApi = createRateLimitedClient(apiClient, {
  maxRequests: 10,
  windowMs: 60000,
  backoffMultiplier: 2,
  maxBackoffMs: 30000,
  onRateLimited: (info) => {
    // Show user notification
    toast({
      title: "Rate Limited",
      description: `Please wait ${info.retryAfter} seconds before trying again.`,
      variant: "destructive"
    });
  }
});

// Use like normal API client
try {
  const response = await rateLimitedApi.post('/api/kyc/verify', data);
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    // Handled by onRateLimited callback
  }
}
```

## Monitoring and Alerting

### Tracking Violations

```typescript
import { useRateLimitMonitor } from '@/lib/utils/rate-limit-monitor';

function AdminDashboard() {
  const {
    stats,
    suspiciousPatterns,
    recordViolation,
    exportData
  } = useRateLimitMonitor({
    suspiciousThreshold: 10, // 10 violations trigger alert
    timeWindowMs: 300000, // 5 minute window
    onSuspiciousActivity: (pattern) => {
      // Send alert
      console.error('Suspicious activity detected:', pattern);
    }
  });

  return (
    <div>
      <h3>Rate Limit Statistics</h3>
      <p>Total violations: {stats?.totalViolations}</p>
      <p>Suspicious patterns: {stats?.suspiciousPatterns}</p>
      
      <button onClick={() => {
        const csv = exportData('csv');
        // Download CSV
      }}>
        Export Violations
      </button>
    </div>
  );
}
```

### Recording Violations

```typescript
// In middleware or API route
if (!allowed) {
  monitor.recordViolation({
    endpoint: '/api/kyc/verify',
    clientId: getUserId(),
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent'),
    attemptCount: attempts,
    limit: 5,
    windowMs: 60000
  });
}
```

## Security Considerations

### Rate Limit Bypass Prevention

1. **Multiple Identifiers**: Use combination of IP, session, and user ID
2. **Distributed Tracking**: Store rate limits in Redis for multi-instance deployments
3. **Header Validation**: Verify X-Forwarded-For headers aren't spoofed
4. **Session Binding**: Tie rate limits to authenticated sessions when possible

### DDoS Protection

Rate limiting helps protect against:
- Brute force attacks on authentication
- API abuse and scraping
- Resource exhaustion attacks
- Automated form submissions

### Monitoring Patterns

Watch for:
- Rapid sequential requests from single source
- Distributed attacks from multiple IPs
- Unusual patterns (e.g., exact timing between requests)
- Attempts to bypass limits through header manipulation

## Recovery Strategies

### For Users

1. **Wait for Reset**: Most limits reset within minutes
2. **Reduce Request Frequency**: Space out requests
3. **Use Batch Operations**: Combine multiple operations when possible
4. **Contact Support**: For legitimate high-volume needs

### For Developers

1. **Implement Caching**: Reduce redundant API calls
2. **Use Webhooks**: For real-time updates instead of polling
3. **Batch Requests**: Combine multiple operations
4. **Request Limit Increase**: Contact platform team for higher limits

## Testing Rate Limits

### Manual Testing

```bash
# Test rate limiting with curl
for i in {1..10}; do
  curl -X POST https://clearhold.app/api/kyc/verify \
    -H "Content-Type: application/json" \
    -d '{"test": true}' \
    -w "\nStatus: %{http_code}\n"
  sleep 0.5
done
```

### Automated Testing

```typescript
import { RateLimiter } from '@/lib/utils/rate-limiter';

describe('Rate Limiting', () => {
  it('should enforce limits', async () => {
    const limiter = new ClientRateLimiter({
      maxRequests: 3,
      windowMs: 1000
    });

    // First 3 requests should pass
    for (let i = 0; i < 3; i++) {
      expect(await limiter.checkLimit('/test')).toBe(true);
    }

    // 4th request should fail
    expect(await limiter.checkLimit('/test')).toBe(false);

    // Wait for window to reset
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should allow requests again
    expect(await limiter.checkLimit('/test')).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

1. **"Too Many Requests" Error**
   - Wait for the time specified in Retry-After header
   - Check if you're making redundant requests
   - Implement proper error handling

2. **Rate Limit Not Resetting**
   - Check system time synchronization
   - Clear browser cache/cookies
   - Verify sliding window calculation

3. **Inconsistent Limits**
   - Check if different endpoints have different limits
   - Verify client-side tracking matches server-side
   - Ensure proper header parsing

### Debug Mode

Enable debug logging:

```typescript
const rateLimiter = new ClientRateLimiter({
  // ... config
  debug: true // Logs all rate limit decisions
});
```

## API Reference

### Rate Limiter Configuration

```typescript
interface RateLimitConfig {
  maxRequests: number;        // Maximum requests allowed
  windowMs: number;           // Time window in milliseconds
  backoffMultiplier?: number; // Exponential backoff multiplier (default: 2)
  maxBackoffMs?: number;      // Maximum backoff time (default: 60000)
  onRateLimited?: (info: RateLimitInfo) => void;
  onRecovered?: () => void;
}
```

### Rate Limit Info

```typescript
interface RateLimitInfo {
  limit: number;      // Maximum requests allowed
  remaining: number;  // Requests remaining in window
  reset: Date;        // When the limit resets
  retryAfter?: number; // Seconds until retry (when limited)
}
```

## Compliance and Legal

- Rate limits comply with fair usage policies
- Legitimate users can request limit increases
- Rate limiting data is retained for security analysis
- Users are notified when approaching limits
- Clear documentation provided for API consumers