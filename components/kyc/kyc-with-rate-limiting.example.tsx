'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { RateLimitIndicator, FloatingRateLimitIndicator } from './rate-limit-indicator';
import { useClientRateLimit, createRateLimitedClient } from '@/lib/utils/rate-limiter';
import { useRateLimitMonitor } from '@/lib/utils/rate-limit-monitor';

/**
 * Example KYC form with integrated rate limiting
 */
export function KYCFormWithRateLimiting() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    ssn: ''
  });

  // Rate limiting for form submission
  const {
    isRateLimited,
    rateLimitInfo,
    checkLimit,
    recordRequest,
    handleError
  } = useClientRateLimit('/api/kyc/personal', {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    onRateLimited: (info) => {
      toast({
        title: "Rate Limited",
        description: `Too many submission attempts. Please wait ${info.retryAfter} seconds.`,
        variant: "destructive"
      });
    },
    onRecovered: () => {
      toast({
        title: "Rate Limit Reset",
        description: "You can now submit your information again.",
        variant: "default"
      });
    }
  });

  // Rate limiting monitoring (for admin view)
  const { recordViolation } = useRateLimitMonitor({
    suspiciousThreshold: 5,
    timeWindowMs: 300000, // 5 minutes
    onSuspiciousActivity: (pattern) => {
      console.warn('Suspicious KYC activity detected:', pattern);
      // In production, this would trigger security alerts
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limit before submission
    const canSubmit = await checkLimit();
    if (!canSubmit) {
      // Rate limit message already shown by onRateLimited callback
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/kyc/personal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      // Record request with rate limit headers
      recordRequest({
        'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
        'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
        'x-ratelimit-reset': response.headers.get('x-ratelimit-reset'),
        'retry-after': response.headers.get('retry-after')
      });

      if (response.status === 429) {
        // Rate limited by server
        const retryAfter = response.headers.get('retry-after');
        handleError(retryAfter ? parseInt(retryAfter) : undefined);
        
        // Record violation for monitoring
        recordViolation({
          endpoint: '/api/kyc/personal',
          clientId: 'user-session-id', // Get from auth context
          attemptCount: 10,
          limit: 10,
          windowMs: 60000
        });
        
        return;
      }

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      toast({
        title: "Success",
        description: "Your information has been submitted successfully.",
        variant: "default"
      });

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        ssn: ''
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit your information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Please provide your personal details for verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rate limit indicator */}
        <RateLimitIndicator
          endpoint="/api/kyc/personal"
          maxRequests={10}
          windowMs={60000}
          showDetails={true}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
                disabled={isRateLimited || isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
                disabled={isRateLimited || isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              required
              disabled={isRateLimited || isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ssn">Social Security Number</Label>
            <Input
              id="ssn"
              type="password"
              value={formData.ssn}
              onChange={(e) => setFormData(prev => ({ ...prev, ssn: e.target.value }))}
              placeholder="XXX-XX-XXXX"
              required
              disabled={isRateLimited || isSubmitting}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isRateLimited || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : isRateLimited ? (
              `Rate Limited (${rateLimitInfo?.retryAfter}s)`
            ) : (
              'Submit Information'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Example document upload with rate limiting
 */
export function DocumentUploadWithRateLimiting() {
  const [isUploading, setIsUploading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);

  // Create rate-limited API client
  const rateLimitedApi = React.useMemo(() => 
    createRateLimitedClient(fetch, {
      maxRequests: 5,
      windowMs: 60000,
      backoffMultiplier: 2,
      maxBackoffMs: 30000,
      onRateLimited: (info) => {
        toast({
          title: "Upload Rate Limited",
          description: `Please wait ${info.retryAfter} seconds before uploading again.`,
          variant: "destructive"
        });
      }
    }), []
  );

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('type', 'passport');

      // Rate-limited upload
      const response = await rateLimitedApi.post('/api/kyc/documents', formData);

      toast({
        title: "Upload Successful",
        description: "Your document has been uploaded for verification.",
        variant: "default"
      });

      setFile(null);
    } catch (error: any) {
      if (error.code === 'RATE_LIMITED') {
        // Already handled by onRateLimited callback
      } else {
        toast({
          title: "Upload Failed",
          description: "Failed to upload document. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Upload</CardTitle>
        <CardDescription>
          Upload your identification documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rate limit indicator for uploads */}
        <RateLimitIndicator
          endpoint="/api/kyc/documents"
          maxRequests={5}
          windowMs={60000}
          showDetails={false}
        />

        <div className="space-y-4">
          <Input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={isUploading}
          />

          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example page showing full KYC flow with rate limiting
 */
export default function KYCPageWithRateLimiting() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">KYC Verification</h1>

      {/* Floating rate limit indicator */}
      <FloatingRateLimitIndicator
        endpoint="/api/kyc"
        maxRequests={30}
        windowMs={60000}
        threshold={0.7}
      />

      {/* Personal Information Form */}
      <KYCFormWithRateLimiting />

      {/* Document Upload */}
      <DocumentUploadWithRateLimiting />

      {/* Rate Limit Monitoring (admin view) */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle>Rate Limit Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <RateLimitMonitor
              endpoints={[
                {
                  name: 'Personal Info',
                  endpoint: '/api/kyc/personal',
                  maxRequests: 10,
                  windowMs: 60000
                },
                {
                  name: 'Document Upload',
                  endpoint: '/api/kyc/documents',
                  maxRequests: 5,
                  windowMs: 60000
                },
                {
                  name: 'Verification',
                  endpoint: '/api/kyc/verification',
                  maxRequests: 5,
                  windowMs: 60000
                }
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}