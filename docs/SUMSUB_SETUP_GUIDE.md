# Sumsub KYC/AML Integration Setup Guide

## Overview
This guide explains how to set up and configure the Sumsub KYC/AML integration for ClearHold using your sandbox account.

## Prerequisites
- Sumsub sandbox account (already created with email: dustin.jasmin@jaspire.co)
- Access to Sumsub dashboard: https://cockpit.sumsub.com/

## Step 1: Get Your Sandbox Credentials

1. Log in to your Sumsub dashboard at https://cockpit.sumsub.com/
2. Navigate to **Developers** → **API Keys** section
3. Find your sandbox credentials:
   - **App Token**: This is your application identifier
   - **Secret Key**: This is used for signing API requests
4. Keep these credentials secure and never commit them to version control

## Step 2: Configure Environment Variables

### For Local Development

1. Create a `.env.local` file in the project root:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your Sumsub credentials:
   ```env
   SUMSUB_APP_TOKEN=your_sandbox_app_token_here
   SUMSUB_SECRET_KEY=your_sandbox_secret_key_here
   ```

### For Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - `SUMSUB_APP_TOKEN` - Your Sumsub app token
   - `SUMSUB_SECRET_KEY` - Your Sumsub secret key
4. Make sure to add these for all environments (Production, Preview, Development)

## Step 3: Configure Verification Level

1. In the Sumsub dashboard, go to **Levels** section
2. Create or configure a level named `basic-kyc-aml` with:
   - Document verification (passport, driver's license, national ID)
   - Face verification with liveness check
   - AML screening
   - PEP (Politically Exposed Person) check
   - Sanctions list screening

## Step 4: Configure Webhooks (Optional but Recommended)

1. In Sumsub dashboard, go to **Webhooks** section
2. Add a webhook URL:
   - For local testing: Use ngrok or similar tunnel service
   - For production: `https://your-domain.com/api/kyc/webhook`
3. Select events to receive:
   - `applicantReviewed` - When review is complete
   - `applicantPersonalInfoChanged` - When user info changes
   - `applicantDeleted` - When applicant is deleted

## Step 5: Test the Integration

### Testing the Token Generation

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test the token endpoint:
   ```bash
   curl -X GET http://localhost:3000/api/kyc/sumsub-token
   ```
   
   You should see:
   ```json
   {
     "success": true,
     "message": "Sumsub token endpoint is available",
     "configured": true
   }
   ```

### Testing the Full KYC Flow

1. Navigate to http://localhost:3000/onboarding/welcome
2. Complete the onboarding flow:
   - Accept terms and conditions
   - Fill in personal information
   - Select document type
   - Complete verification through Sumsub SDK
   - View results on completion page

## Step 6: Monitoring and Debugging

### View Applicants in Sumsub Dashboard

1. Go to **Applicants** section in Sumsub dashboard
2. You'll see all test applicants created during development
3. Click on any applicant to view:
   - Submitted documents
   - Verification results
   - AML screening results
   - Detailed logs

### Common Issues and Solutions

**Issue**: "KYC service not configured" error
- **Solution**: Ensure environment variables are properly set

**Issue**: Invalid signature error from Sumsub
- **Solution**: Check that your secret key is correct and not truncated

**Issue**: Applicant not found
- **Solution**: The userId must match between token generation and status checks

**Issue**: SDK not loading
- **Solution**: Check browser console for CSP errors, ensure Sumsub domains are whitelisted

## Step 7: Production Considerations

When moving to production:

1. **Switch to Production Credentials**:
   - Get production API keys from Sumsub
   - Update environment variables in Vercel

2. **Configure Production Level**:
   - Create a production verification level
   - Set appropriate risk thresholds
   - Configure document requirements per region

3. **Implement Backend Integration**:
   - Store verification results in database
   - Implement webhook handlers for real-time updates
   - Add compliance reporting features

4. **Security Measures**:
   - Never expose API credentials to frontend
   - Implement rate limiting on token generation
   - Add authentication checks to all KYC endpoints
   - Log all KYC-related activities for audit trail

## Sandbox Testing Tips

1. **Test Documents**: Sumsub provides test documents in sandbox mode
2. **Test Scenarios**: You can trigger different verification results:
   - GREEN (approved): Use valid test documents
   - YELLOW (manual review): Use specific test cases
   - RED (rejected): Use invalid or expired documents

3. **Reset Test Data**: You can delete test applicants from the dashboard

## Support Resources

- Sumsub Documentation: https://docs.sumsub.com/
- API Reference: https://docs.sumsub.com/reference/
- Support Email: support@sumsub.com
- ClearHold Integration Issues: Contact your development team

## Next Steps

After successful sandbox testing:

1. Plan production rollout timeline
2. Review compliance requirements for target regions
3. Set up monitoring and alerting
4. Train support team on KYC processes
5. Prepare user documentation and FAQs