'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Download, RefreshCw, Shield, TrendingUp, Users } from 'lucide-react';
import { useRateLimitMonitor, type RateLimitPattern } from '@/lib/utils/rate-limit-monitor';
import { RateLimitMonitor } from './rate-limit-indicator';
import { cn } from '@/lib/utils';

interface RateLimitDashboardProps {
  className?: string;
}

/**
 * Admin dashboard for monitoring rate limits across the platform
 */
export function RateLimitDashboard({ className }: RateLimitDashboardProps) {
  const [refreshInterval, setRefreshInterval] = React.useState(5000);
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  const {
    stats,
    suspiciousPatterns,
    recordViolation,
    clearClient,
    exportData
  } = useRateLimitMonitor({
    suspiciousThreshold: 10,
    timeWindowMs: 300000, // 5 minutes
    persistViolations: true,
    maxViolationHistory: 1000,
    onSuspiciousActivity: (pattern) => {
      // In production, this would send alerts to security team
      console.error('Security Alert: Suspicious rate limit pattern detected', pattern);
    }
  });

  // Auto-refresh effect
  React.useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      // Force component re-render to update stats
      setRefreshInterval(prev => prev);
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval]);

  const handleExport = (format: 'json' | 'csv') => {
    const data = exportData(format);
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rate-limit-violations-${new Date().toISOString()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatClientId = (clientId: string) => {
    // Anonymize for display
    if (clientId.length > 10) {
      return `${clientId.slice(0, 6)}...${clientId.slice(-4)}`;
    }
    return clientId;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Rate Limit Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor API usage and detect suspicious patterns
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2",
              autoRefresh && "animate-spin"
            )} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalViolations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 5 minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Unique Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueClients || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Violating limits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Suspicious Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.suspiciousPatterns || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Most Hit Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">
              {stats?.topEndpoints?.[0]?.endpoint || 'None'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.topEndpoints?.[0]?.count || 0} violations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious Activity Alerts */}
      {suspiciousPatterns.length > 0 && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Security Alert</AlertTitle>
          <AlertDescription>
            {suspiciousPatterns.length} suspicious rate limit patterns detected. 
            Review the patterns below and take action if necessary.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Views */}
      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patterns">Suspicious Patterns</TabsTrigger>
          <TabsTrigger value="endpoints">Top Endpoints</TabsTrigger>
          <TabsTrigger value="clients">Top Clients</TabsTrigger>
          <TabsTrigger value="live">Live Monitor</TabsTrigger>
        </TabsList>

        {/* Suspicious Patterns Tab */}
        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>Suspicious Activity Patterns</CardTitle>
              <CardDescription>
                Clients showing abnormal request patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suspiciousPatterns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No suspicious patterns detected
                </div>
              ) : (
                <div className="space-y-4">
                  {suspiciousPatterns.map((pattern: RateLimitPattern) => (
                    <Card key={pattern.clientId} className="border-destructive">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">
                              Client: {formatClientId(pattern.clientId)}
                            </CardTitle>
                            <CardDescription>
                              {pattern.totalViolations} violations across {pattern.endpoints.size} endpoints
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="destructive">High Risk</Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => clearClient(pattern.clientId)}
                            >
                              Block Client
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">First violation:</span>
                            <p className="font-medium">
                              {pattern.firstViolation.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last violation:</span>
                            <p className="font-medium">
                              {pattern.lastViolation.toLocaleString()}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Endpoints targeted:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Array.from(pattern.endpoints).map(endpoint => (
                                <Badge key={endpoint} variant="secondary" className="text-xs">
                                  {endpoint}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Endpoints Tab */}
        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle>Most Violated Endpoints</CardTitle>
              <CardDescription>
                API endpoints with the most rate limit violations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="text-right">Violations</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.topEndpoints?.map((endpoint) => (
                    <TableRow key={endpoint.endpoint}>
                      <TableCell className="font-medium">
                        {endpoint.endpoint}
                      </TableCell>
                      <TableCell className="text-right">
                        {endpoint.count}
                      </TableCell>
                      <TableCell className="text-right">
                        <TrendingUp className="h-4 w-4 text-destructive inline" />
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No violations recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Clients Tab */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Top Violating Clients</CardTitle>
              <CardDescription>
                Clients with the most rate limit violations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client ID</TableHead>
                    <TableHead className="text-right">Violations</TableHead>
                    <TableHead className="text-right">Risk Level</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.topClients?.map((client) => (
                    <TableRow key={client.clientId}>
                      <TableCell className="font-medium">
                        {formatClientId(client.clientId)}
                      </TableCell>
                      <TableCell className="text-right">
                        {client.count}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={client.count > 10 ? "destructive" : "secondary"}
                        >
                          {client.count > 10 ? 'High' : 'Medium'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => clearClient(client.clientId)}
                        >
                          Clear
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No violations recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Monitor Tab */}
        <TabsContent value="live">
          <Card>
            <CardHeader>
              <CardTitle>Live Rate Limit Monitor</CardTitle>
              <CardDescription>
                Real-time view of rate limit status across endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RateLimitMonitor
                endpoints={[
                  {
                    name: 'KYC Personal Info',
                    endpoint: '/api/kyc/personal',
                    maxRequests: 10,
                    windowMs: 60000
                  },
                  {
                    name: 'KYC Documents',
                    endpoint: '/api/kyc/documents',
                    maxRequests: 5,
                    windowMs: 60000
                  },
                  {
                    name: 'KYC Verification',
                    endpoint: '/api/kyc/verification',
                    maxRequests: 5,
                    windowMs: 60000
                  },
                  {
                    name: 'Login Attempts',
                    endpoint: '/api/auth/login',
                    maxRequests: 5,
                    windowMs: 900000
                  },
                  {
                    name: 'Transaction Creation',
                    endpoint: '/api/transactions',
                    maxRequests: 10,
                    windowMs: 3600000
                  },
                  {
                    name: 'File Uploads',
                    endpoint: '/api/files/upload',
                    maxRequests: 20,
                    windowMs: 3600000
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}