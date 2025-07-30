# Sumsub KYC/AML Implementation Plan for ClearHold

## Overview
This document outlines the implementation of Sumsub's KYC/AML verification as a multi-step onboarding sequence for new ClearHold users.

## Sumsub Integration Architecture

### 1. Integration Method
We'll use Sumsub's **Web SDK** for the frontend integration, which provides:
- Pre-built UI components
- Real-time document capture
- Liveness detection
- Seamless mobile/desktop experience
- Automatic retry handling

### 2. Backend Integration
- API integration for user management
- Webhook handling for verification results
- Secure token generation
- Status tracking and updates

## Multi-Step KYC Onboarding Flow

### Step 1: Welcome & Consent (Custom Page)
```typescript
// Route: /onboarding/welcome
```
- Explain why KYC is required
- Display privacy policy and terms
- Collect user consent for verification
- Show estimated time (5-10 minutes)

**UI Elements:**
- Welcome message explaining escrow platform requirements
- Checkbox consent for data processing
- Progress indicator showing all steps
- "Begin Verification" CTA button

### Step 2: Basic Information (Custom Page)
```typescript
// Route: /onboarding/basic-info
```
- Full legal name
- Date of birth
- Residential address
- Phone number
- Occupation/Employment status
- Source of funds (for AML)

**UI Elements:**
- Form with validation
- Address autocomplete
- Country selector
- Save & Continue button

### Step 3: Document Selection (Custom Page)
```typescript
// Route: /onboarding/document-type
```
Let users choose their document type:
- Passport (recommended for single-page capture)
- Driver's License (requires front & back)
- National ID Card (requires front & back)

**UI Elements:**
- Document type cards with icons
- Availability by country indicator
- Tips for successful verification

### Step 4: Sumsub SDK Integration (Embedded)
```typescript
// Route: /onboarding/verify
```
Launch Sumsub Web SDK for:
1. **Document Capture**
   - Auto-capture with edge detection
   - Quality checks
   - OCR data extraction

2. **Liveness Check**
   - Face matching with document
   - Anti-spoofing detection
   - 3D liveness verification

3. **Additional Checks** (if required)
   - Proof of address
   - Source of funds documentation

### Step 5: Processing & Status (Custom Page)
```typescript
// Route: /onboarding/processing
```
While Sumsub processes (typically 60 seconds):
- Show processing animation
- Display what's being checked
- Set expectations for review time

### Step 6: Results & Next Steps
```typescript
// Route: /onboarding/complete
```
Based on verification result:

**GREEN (Approved):**
- Success message
- Enable wallet connection
- Redirect to dashboard

**RED with RETRY:**
- Explain issues found
- Allow document resubmission
- Provide help resources

**RED with FINAL:**
- Apologetic message
- Support contact information
- Appeal process (if applicable)

## Technical Implementation

### 1. Sumsub Web SDK Integration

```typescript
// components/kyc/SumsubWebSDK.tsx
import React, { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';

interface SumsubSDKProps {
  onComplete: (success: boolean) => void;
  onError: (error: any) => void;
}

export function SumsubWebSDK({ onComplete, onError }: SumsubSDKProps) {
  const { user } = useAuth();

  useEffect(() => {
    // 1. Get access token from backend
    fetchAccessToken();
    
    // 2. Initialize Sumsub SDK
    initializeSumsubSDK();
  }, []);

  const fetchAccessToken = async () => {
    const response = await apiClient.post('/api/kyc/sumsub-token', {
      userId: user?.id,
      levelName: 'basic-kyc-aml' // Your Sumsub level
    });
    
    return response.data.token;
  };

  const initializeSumsubSDK = async () => {
    const accessToken = await fetchAccessToken();
    
    // Initialize Sumsub Web SDK
    const snsWebSdkInstance = snsWebSdk.init(
      accessToken,
      () => {
        // Token expired, fetch new one
        return fetchAccessToken();
      }
    )
    .withConf({
      lang: 'en',
      theme: 'light',
      uiConf: {
        customCss: getCustomStyles(),
      }
    })
    .withOptions({ addViewportTag: false, adaptIframeHeight: true })
    .on('idCheck.onStepCompleted', (payload) => {
      console.log('Step completed:', payload);
    })
    .on('idCheck.onError', (error) => {
      console.error('Verification error:', error);
      onError(error);
    })
    .on('idCheck.applicantStatus', (payload) => {
      if (payload.reviewResult.reviewAnswer === 'GREEN') {
        onComplete(true);
      }
    })
    .build();
    
    // Mount to container
    snsWebSdkInstance.launch('#sumsub-websdk-container');
  };

  return (
    <div id="sumsub-websdk-container" className="w-full h-full min-h-[600px]" />
  );
}
```

### 2. Backend API Endpoints

```typescript
// backend/src/api/routes/kyc/sumsubRoutes.js

// Generate access token for Web SDK
router.post('/sumsub-token', authenticate, async (req, res) => {
  const { userId, levelName } = req.body;
  
  // Create or get applicant
  const applicant = await sumsubService.createApplicant(userId, {
    email: req.user.email,
    phone: req.user.phone,
    fixedInfo: {
      firstName: req.user.firstName,
      lastName: req.user.lastName,
    }
  });
  
  // Generate access token
  const token = await sumsubService.generateAccessToken(
    applicant.id,
    levelName
  );
  
  res.json({ token });
});

// Webhook handler for verification results
router.post('/sumsub-webhook', async (req, res) => {
  const signature = req.headers['x-sumsub-signature'];
  
  // Verify webhook signature
  if (!sumsubService.verifyWebhookSignature(req.body, signature)) {
    return res.status(401).send('Invalid signature');
  }
  
  const { type, applicantId, reviewResult } = req.body;
  
  if (type === 'applicantReviewed') {
    await handleVerificationResult(applicantId, reviewResult);
  }
  
  res.status(200).send('OK');
});
```

### 3. Webhook Event Handling

```typescript
async function handleVerificationResult(applicantId, reviewResult) {
  const { reviewAnswer, rejectLabels, moderationComment } = reviewResult;
  
  // Find user by applicant ID
  const user = await getUserByApplicantId(applicantId);
  
  switch (reviewAnswer) {
    case 'GREEN':
      // Verification successful
      await updateUserKYCStatus(user.id, {
        status: 'verified',
        verifiedAt: new Date(),
        level: 'basic'
      });
      
      // Enable trading/escrow features
      await enableUserFeatures(user.id);
      
      // Send success email
      await sendKYCSuccessEmail(user.email);
      break;
      
    case 'RED':
      if (reviewResult.reviewRejectType === 'RETRY') {
        // Allow retry
        await updateUserKYCStatus(user.id, {
          status: 'needs_retry',
          rejectReasons: rejectLabels,
          comment: moderationComment
        });
        
        // Send retry email with instructions
        await sendKYCRetryEmail(user.email, rejectLabels);
      } else {
        // Final rejection
        await updateUserKYCStatus(user.id, {
          status: 'rejected',
          rejectReasons: rejectLabels,
          comment: moderationComment
        });
        
        // Send rejection email
        await sendKYCRejectionEmail(user.email);
      }
      break;
  }
}
```

### 4. State Management

```typescript
// context/kyc-context.tsx
interface KYCContextType {
  kycStatus: 'not_started' | 'in_progress' | 'processing' | 'verified' | 'needs_retry' | 'rejected';
  kycLevel: 'none' | 'basic' | 'enhanced';
  startKYC: () => void;
  retryKYC: () => void;
  kycData: {
    applicantId?: string;
    verifiedAt?: Date;
    rejectReasons?: string[];
  };
}
```

## Sumsub Configuration

### 1. Verification Level Setup
Create a verification level in Sumsub dashboard with:
- **Document step**: ID + Selfie
- **AML screening**: Enabled
- **Liveness**: 3D Liveness check
- **Address verification**: Optional (for enhanced KYC)

### 2. Risk Rules
Configure automated rules for crypto compliance:
- Sanctions screening
- PEP (Politically Exposed Persons) check
- Adverse media screening
- Crypto address screening (for withdrawals)

### 3. Customization
- Brand colors and logo
- Custom CSS for SDK
- Localization for multiple languages
- Mobile-optimized flow

## Security Considerations

1. **Token Security**
   - Generate Sumsub access tokens server-side only
   - Use short-lived tokens (15 minutes)
   - Implement token refresh mechanism

2. **Data Protection**
   - All KYC data stored in Sumsub's secure environment
   - Only store verification status and applicant ID locally
   - Implement data retention policies

3. **Webhook Security**
   - Verify webhook signatures
   - Use HTTPS endpoints only
   - Implement idempotency

## Pricing Considerations ($249/month plan)

The $249/month Sumsub plan typically includes:
- Up to 1,000 verifications/month
- Basic KYC + AML screening
- Liveness detection
- Document verification
- Sanctions & PEP screening
- API access
- Webhook notifications
- Basic analytics

For crypto-specific features:
- Crypto address screening (may be add-on)
- Travel Rule compliance (may be add-on)
- Enhanced due diligence

## Implementation Timeline

1. **Week 1**: Backend integration
   - API setup
   - Webhook endpoints
   - Database schema updates

2. **Week 2**: Frontend flow
   - Onboarding pages
   - SDK integration
   - Error handling

3. **Week 3**: Testing & refinement
   - Sandbox testing
   - Edge cases
   - Mobile optimization

4. **Week 4**: Production deployment
   - Production credentials
   - Monitoring setup
   - Support documentation

## Next Steps

1. Contact Sumsub sales for:
   - Demo account access
   - Sandbox credentials
   - Pricing confirmation
   - Crypto-specific features availability

2. Design review:
   - Create wireframes for each step
   - Review with UX team
   - Get stakeholder approval

3. Technical setup:
   - Create Sumsub account
   - Configure verification levels
   - Set up webhook endpoints
   - Implement backend API

This implementation will provide a smooth, compliant onboarding experience while meeting regulatory requirements for KYC/AML in crypto transactions.