import { NextRequest, NextResponse } from 'next/server';
import { getGlobalRateLimitMonitor } from './rate-limit-monitor';

/**
 * Extract client information from request for rate limit tracking
 */
export function extractClientInfo(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  // Get session or auth token for client ID
  const sessionCookie = request.cookies.get('clearhold_session');
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.replace('Bearer ', '');
  
  const clientId = sessionCookie?.value || authToken || ip;
  
  return {
    clientId,
    ip,
    userAgent: userAgent || undefined
  };
}

/**
 * Create a rate limit error response with proper headers
 */
export function createRateLimitResponse(
  message: string = 'Too many requests',
  retryAfter: number = 60,
  additionalHeaders?: Record<string, string>
) {
  return NextResponse.json(
    {
      error: 'RATE_LIMITED',
      message,
      retryAfter,
      timestamp: new Date().toISOString()
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString(),
        'Content-Type': 'application/json',
        ...additionalHeaders
      }
    }
  );
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  reset: Date
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toISOString());
  response.headers.set('X-RateLimit-Policy', 'sliding-window');
  
  return response;
}

/**
 * Record a rate limit violation for monitoring
 */
export async function recordRateLimitViolation(
  request: NextRequest,
  endpoint: string,
  limit: number,
  windowMs: number,
  attemptCount?: number
) {
  try {
    const monitor = getGlobalRateLimitMonitor();
    const { clientId, ip, userAgent } = extractClientInfo(request);
    
    monitor.recordViolation({
      endpoint,
      clientId,
      ip,
      userAgent,
      attemptCount: attemptCount || limit + 1,
      limit,
      windowMs
    });
  } catch (error) {
    // Don't let monitoring errors affect the response
    console.error('Failed to record rate limit violation:', error);
  }
}

/**
 * Middleware wrapper for API routes with rate limit monitoring
 */
export function withRateLimitMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: {
    endpoint?: string;
    recordViolations?: boolean;
  }
) {
  return async (request: NextRequest) => {
    try {
      const response = await handler(request);
      
      // If rate limited and monitoring enabled
      if (response.status === 429 && config?.recordViolations !== false) {
        const endpoint = config?.endpoint || request.nextUrl.pathname;
        const retryAfter = response.headers.get('retry-after');
        const limit = response.headers.get('x-ratelimit-limit');
        
        await recordRateLimitViolation(
          request,
          endpoint,
          limit ? parseInt(limit) : 10,
          60000, // Default 1 minute window
          undefined
        );
      }
      
      return response;
    } catch (error) {
      console.error('API route error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Check if request should be rate limited based on custom logic
 */
export function shouldRateLimit(
  request: NextRequest,
  customChecks?: Array<(req: NextRequest) => boolean>
): boolean {
  // Check for suspicious patterns
  const suspiciousHeaders = [
    'x-automated-test',
    'x-bot-request',
    'x-scanner'
  ];
  
  for (const header of suspiciousHeaders) {
    if (request.headers.has(header)) {
      return true;
    }
  }
  
  // Check user agent for known bots
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const botPatterns = [
    'bot',
    'crawler',
    'spider',
    'scraper',
    'curl',
    'wget',
    'python-requests'
  ];
  
  for (const pattern of botPatterns) {
    if (userAgent.includes(pattern)) {
      return true;
    }
  }
  
  // Run custom checks
  if (customChecks) {
    for (const check of customChecks) {
      if (check(request)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Parse rate limit headers from response
 */
export function parseRateLimitHeaders(headers: Headers): {
  limit?: number;
  remaining?: number;
  reset?: Date;
  retryAfter?: number;
} {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  const retryAfter = headers.get('retry-after');
  
  return {
    limit: limit ? parseInt(limit) : undefined,
    remaining: remaining ? parseInt(remaining) : undefined,
    reset: reset ? new Date(reset) : undefined,
    retryAfter: retryAfter ? parseInt(retryAfter) : undefined
  };
}

/**
 * Calculate appropriate retry delay with jitter
 */
export function calculateRetryDelay(
  retryAfter: number,
  attemptNumber: number = 1,
  maxDelay: number = 300 // 5 minutes
): number {
  // Base delay from retry-after header
  let delay = retryAfter * 1000;
  
  // Add exponential backoff for multiple attempts
  if (attemptNumber > 1) {
    delay = delay * Math.pow(2, attemptNumber - 1);
  }
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 1000; // 0-1 second jitter
  delay += jitter;
  
  // Cap at maximum delay
  return Math.min(delay, maxDelay * 1000);
}