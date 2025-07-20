'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface EnvTestResult {
  status: string;
  timestamp: string;
  environment: Record<string, string>;
  summary: {
    firebaseConfigured: boolean;
    apiUrlConfigured: boolean;
    runningOnVercel: boolean;
    totalEnvVars: number;
  };
  recommendation: string;
}

export default function TestEnvPage() {
  const [result, setResult] = useState<EnvTestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/test-env')
      .then(res => res.json())
      .then(data => {
        setResult(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8">
            <p className="text-center">Testing environment variables...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-red-500">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result) return null;

  const getStatusIcon = (value: string) => {
    if (value.includes('✓')) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (value.includes('✗')) return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables Test</CardTitle>
          <CardDescription>
            Testing Vercel environment variable integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  {result.summary.firebaseConfigured ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Firebase</p>
                    <p className="text-xs text-muted-foreground">
                      {result.summary.firebaseConfigured ? 'Configured' : 'Not configured'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  {result.summary.apiUrlConfigured ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">API URL</p>
                    <p className="text-xs text-muted-foreground">
                      {result.summary.apiUrlConfigured ? 'Custom' : 'Default'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  {result.summary.runningOnVercel ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Deployment</p>
                    <p className="text-xs text-muted-foreground">
                      {result.summary.runningOnVercel ? 'Vercel' : 'Local'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-sm font-medium">Total Env Vars</p>
                  <p className="text-lg font-bold">{result.summary.totalEnvVars}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Environment Variables */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Environment Variables</h3>
            <div className="space-y-2">
              {Object.entries(result.environment).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(value)}
                    <code className="text-sm font-mono">{key}</code>
                  </div>
                  <Badge variant={value.includes('✓') ? 'default' : value.includes('✗') ? 'destructive' : 'secondary'}>
                    {value}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          <Card className={result.summary.firebaseConfigured ? 'border-green-500' : 'border-yellow-500'}>
            <CardContent className="p-4">
              <p className="text-sm">{result.recommendation}</p>
              {!result.summary.runningOnVercel && (
                <p className="text-sm text-muted-foreground mt-2">
                  Note: You're running locally. Deploy to Vercel to test production environment variables.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          {!result.summary.firebaseConfigured && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How to Configure Environment Variables in Vercel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to your Vercel dashboard</li>
                  <li>Select your project</li>
                  <li>Navigate to Settings → Environment Variables</li>
                  <li>Add each missing variable with its value</li>
                  <li>Redeploy your application</li>
                </ol>
                <p className="text-muted-foreground mt-2">
                  Remember: Variables prefixed with NEXT_PUBLIC_ are exposed to the browser.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}