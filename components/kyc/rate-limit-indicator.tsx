'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Clock, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useClientRateLimit, type RateLimitInfo } from '@/lib/utils/rate-limiter';
import { cn } from '@/lib/utils';

interface RateLimitIndicatorProps {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
  className?: string;
  showDetails?: boolean;
  onRateLimited?: (info: RateLimitInfo) => void;
  onRecovered?: () => void;
}

export function RateLimitIndicator({
  endpoint,
  maxRequests,
  windowMs,
  className,
  showDetails = true,
  onRateLimited,
  onRecovered
}: RateLimitIndicatorProps) {
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const countdownInterval = React.useRef<NodeJS.Timeout>();

  const {
    isRateLimited,
    rateLimitInfo,
    getRemainingRequests
  } = useClientRateLimit(endpoint, {
    maxRequests,
    windowMs,
    onRateLimited,
    onRecovered
  });

  const remaining = getRemainingRequests();
  const percentageUsed = ((maxRequests - remaining) / maxRequests) * 100;

  // Countdown timer when rate limited
  React.useEffect(() => {
    if (isRateLimited && rateLimitInfo?.reset) {
      const updateCountdown = () => {
        const now = Date.now();
        const resetTime = rateLimitInfo.reset.getTime();
        const secondsRemaining = Math.max(0, Math.ceil((resetTime - now) / 1000));
        
        if (secondsRemaining === 0) {
          setCountdown(null);
          clearInterval(countdownInterval.current);
        } else {
          setCountdown(secondsRemaining);
        }
      };

      updateCountdown();
      countdownInterval.current = setInterval(updateCountdown, 1000);

      return () => {
        clearInterval(countdownInterval.current);
      };
    } else {
      setCountdown(null);
    }
  }, [isRateLimited, rateLimitInfo]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusColor = () => {
    if (isRateLimited) return 'destructive';
    if (percentageUsed >= 80) return 'warning';
    if (percentageUsed >= 60) return 'secondary';
    return 'default';
  };

  const getProgressColor = () => {
    if (isRateLimited) return 'bg-destructive';
    if (percentageUsed >= 80) return 'bg-yellow-500';
    if (percentageUsed >= 60) return 'bg-orange-500';
    return 'bg-primary';
  };

  if (!showDetails && !isRateLimited && percentageUsed < 60) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Compact indicator */}
      {!showDetails && (
        <Alert variant={getStatusColor()} className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {isRateLimited ? (
              <>Rate limit exceeded. Retry in {countdown ? formatTime(countdown) : 'calculating...'}</>
            ) : (
              <>{remaining} requests remaining</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed indicator */}
      {showDetails && (
        <Card className={cn(
          'transition-all duration-300',
          isRateLimited && 'border-destructive'
        )}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Rate Limit Status
              </CardTitle>
              <Badge variant={getStatusColor()}>
                {isRateLimited ? 'Rate Limited' : 'Active'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{maxRequests - remaining} used</span>
                <span>{remaining} remaining</span>
              </div>
              <Progress 
                value={percentageUsed} 
                className="h-2"
                indicatorClassName={getProgressColor()}
              />
            </div>

            {/* Status message */}
            {isRateLimited ? (
              <Alert variant="destructive" className="py-2">
                <Clock className="h-4 w-4" />
                <AlertTitle className="text-sm">Rate Limit Exceeded</AlertTitle>
                <AlertDescription className="text-xs">
                  {countdown !== null ? (
                    <>Please wait {formatTime(countdown)} before making more requests.</>
                  ) : (
                    <>Calculating retry time...</>
                  )}
                </AlertDescription>
              </Alert>
            ) : percentageUsed >= 80 ? (
              <Alert variant="warning" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Approaching rate limit. Consider spacing out your requests.
                </AlertDescription>
              </Alert>
            ) : percentageUsed >= 60 ? (
              <Alert className="py-2">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {remaining} requests remaining in this window.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Rate limit healthy</span>
              </div>
            )}

            {/* Additional info */}
            {rateLimitInfo && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Limit:</span>{' '}
                  <span className="font-medium">{rateLimitInfo.limit} requests</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Window:</span>{' '}
                  <span className="font-medium">{windowMs / 1000}s</span>
                </div>
                {rateLimitInfo.reset && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Resets at:</span>{' '}
                    <span className="font-medium">
                      {rateLimitInfo.reset.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Floating rate limit indicator that appears when approaching limits
 */
export function FloatingRateLimitIndicator({
  endpoint,
  maxRequests,
  windowMs,
  threshold = 0.8
}: {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
  threshold?: number;
}) {
  const [show, setShow] = React.useState(false);
  const [position, setPosition] = React.useState<'top' | 'bottom'>('bottom');
  
  const {
    isRateLimited,
    rateLimitInfo,
    getRemainingRequests
  } = useClientRateLimit(endpoint, {
    maxRequests,
    windowMs
  });

  const remaining = getRemainingRequests();
  const percentageUsed = ((maxRequests - remaining) / maxRequests);

  React.useEffect(() => {
    setShow(isRateLimited || percentageUsed >= threshold);
  }, [isRateLimited, percentageUsed, threshold]);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Show at top if scrolled past halfway
      setPosition(scrollY > (documentHeight - windowHeight) / 2 ? 'top' : 'bottom');
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!show) return null;

  return (
    <div
      className={cn(
        'fixed left-4 right-4 z-50 max-w-md mx-auto transition-all duration-300',
        position === 'top' ? 'top-4' : 'bottom-4',
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <RateLimitIndicator
        endpoint={endpoint}
        maxRequests={maxRequests}
        windowMs={windowMs}
        showDetails={false}
        className="shadow-lg"
      />
    </div>
  );
}

/**
 * Rate limit monitoring dashboard component
 */
export function RateLimitMonitor({
  endpoints,
  className
}: {
  endpoints: Array<{
    name: string;
    endpoint: string;
    maxRequests: number;
    windowMs: number;
  }>;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold">API Rate Limits</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {endpoints.map((config) => (
          <div key={config.endpoint}>
            <h4 className="text-sm font-medium mb-2">{config.name}</h4>
            <RateLimitIndicator
              endpoint={config.endpoint}
              maxRequests={config.maxRequests}
              windowMs={config.windowMs}
              showDetails={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
}