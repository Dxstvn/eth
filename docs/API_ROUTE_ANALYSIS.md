# Backend API Route Analysis

## Overview
This document provides a comprehensive analysis of the backend API routes in `/backend/src/api/` and `/backend/src/server.js` compared to the frontend `api-config.ts`.

## Server Configuration (server.js)
The Express server mounts the following routers:

```javascript
app.use('/auth', loginRouter);
app.use('/files', fileUploadRouter);
app.use('/contact', contactRouter);
app.use('/transaction', transactionRouter);
app.use('/wallet', walletRouter);
app.use('/health', healthCheckRouter);
```

## Detailed Route Analysis

### 1. Authentication Routes (`/auth`)
**File:** `/backend/src/api/routes/auth/loginSignUp.js`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/auth/signUpEmailPass` | Email/password sign-up | `email`, `password`, `walletAddress?` | `token`, `tokenType`, `userId`, `user` |
| POST | `/auth/signInEmailPass` | Email/password sign-in | `email`, `password` | `token`, `tokenType`, `userId`, `user` |
| POST | `/auth/signInGoogle` | Google sign-in | `idToken` | `token`, `tokenType`, `userId`, `user` |
| POST | `/auth/refreshToken` | Token refresh (not implemented) | `refreshToken` | Error 501 |

### 2. File Management Routes (`/files`)
**File:** `/backend/src/api/routes/database/fileUploadDownload.js`

| Method | Endpoint | Description | Auth Required | Request Body/Params |
|--------|----------|-------------|---------------|---------------------|
| POST | `/files/upload` | Upload file | Yes | `file` (multipart), `dealId` |
| GET | `/files/my-deals` | Get files for user's deals | Yes | - |
| GET | `/files/download/:dealId/:fileId` | Download specific file | Yes | `dealId`, `fileId` (params) |

### 3. Contact Management Routes (`/contact`)
**File:** `/backend/src/api/routes/contact/contactRoutes.js`

| Method | Endpoint | Description | Auth Required | Request Body/Params |
|--------|----------|-------------|---------------|---------------------|
| POST | `/contact/invite` | Send contact invitation | Yes | `contactEmail` |
| GET | `/contact/pending` | Get pending invitations | Yes | - |
| POST | `/contact/response` | Accept/deny invitation | Yes | `invitationId`, `action` |
| GET | `/contact/contacts` | Get user's contacts | Yes | - |
| DELETE | `/contact/contacts/:contactId` | Delete a contact | Yes | `contactId` (param) |

### 4. Transaction Routes (`/transaction`)
**File:** `/backend/src/api/routes/transaction/transactionRoutes.js`

| Method | Endpoint | Description | Auth Required | Request Body/Params |
|--------|----------|-------------|---------------|---------------------|
| GET | `/transaction/v3/quote` | Get cross-chain fee quote | No | `sourceChainId`, `targetChainId`, `amount`, `depositToken?`, `targetToken?` |
| POST | `/transaction/create` | Create new deal | Yes | Complex object (see below) |
| POST | `/transaction/updateCondition` | Update deal condition | Yes | `dealId`, `conditionIndex`, `status` |
| POST | `/transaction/releaseEscrow` | Release escrow funds | Yes | `dealId`, `crossChainFee?` |
| POST | `/transaction/raiseDispute` | Raise a dispute | Yes | `dealId`, `reason` |
| POST | `/transaction/resolveDispute` | Resolve a dispute | Yes | `dealId`, `releaseFunds` |
| GET | `/transaction/deal/:dealId` | Get deal details | No | `dealId` (param) |
| GET | `/transaction/transactions` | Get user's transactions | Yes | `limit?` (query) |
| GET | `/transaction/:dealId` | Alternative deal details | Yes | `dealId` (param) |
| PATCH | `/transaction/conditions/:conditionId/buyer-review` | Update condition status | No | `dealId`, `status` |
| PUT | `/transaction/:dealId/sync-status` | Sync smart contract status | Yes | `newSCStatus`, `eventMessage?`, `finalApprovalDeadlineISO?` |
| POST | `/transaction/:dealId/sc/start-final-approval` | Start final approval | No | `finalApprovalDeadlineISO` |
| POST | `/transaction/:dealId/sc/raise-dispute` | Raise SC dispute | No | `conditionId`, `disputeResolutionDeadlineISO` |
| POST | `/transaction/estimate-gas` | Estimate gas costs | Yes | `operation`, `network`, `amount?`, `dealId?` |
| GET | `/transaction/admin/manual-intervention` | Get deals needing intervention | No | - |

#### Create Deal Request Body Structure:
```javascript
{
  amount: number,
  sellerEmail: string,
  productDescription: string,
  productPhotos?: string[],
  conditions: string | Array<{text: string, status: string}>,
  sellerWalletAddress: string,
  buyerWalletAddress: string,
  isSeller: boolean,
  contractType?: string,
  productCategory?: string,
  buyerNetwork: string,
  sellerNetwork: string,
  tokenAddress?: string,
  depositToken?: string,
  targetToken?: string,
  disputeResolutionPeriodDays?: number (1-30, default 7)
}
```

### 5. Wallet Management Routes (`/wallet`)
**File:** `/backend/src/api/routes/wallet/walletRoutes.js`

| Method | Endpoint | Description | Auth Required | Request Body/Params |
|--------|----------|-------------|---------------|---------------------|
| POST | `/wallet/register` | Register/update wallet | Yes | `address`, `name`, `network`, `publicKey?`, `isPrimary?` |
| GET | `/wallet/` | Get user's wallets | Yes | - |
| GET | `/wallet/chains` | Get supported chains | No | - |
| GET | `/wallet/tokens/:chainId` | Get tokens for chain | No | `chainId` (param) |
| PUT | `/wallet/primary` | Set primary wallet | Yes | `address`, `network` |
| PUT | `/wallet/balance` | Update wallet balance | Yes | `address`, `network`, `balance` |
| GET | `/wallet/preferences` | Get wallet preferences | Yes | - |
| POST | `/wallet/detection` | Process wallet detection | Yes | `detectedWallets` |
| DELETE | `/wallet/:address` | Delete wallet | Yes | `address` (param), `network` (body) |

### 6. Health Check Routes (`/health`)
**File:** `/backend/src/api/routes/health/health.js`

| Method | Endpoint | Description | Auth Required | Response |
|--------|----------|-------------|---------------|----------|
| GET | `/health/simple` | Basic health check | No | `status`, `timestamp`, `environment`, `port` |
| GET | `/health/` | Full health check with Firebase | No | `status`, `firebase`, `timestamp`, `environment` |

## Current Frontend Configuration Comparison

The current `api-config.ts` has:

```typescript
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.clearhold.app',
  endpoints: {
    auth: '/auth',
    wallet: '/wallet',
    transaction: '/transaction',
    contact: '/contact',
    files: '/files'
  }
};
```

### Missing from Frontend Config:
1. Health check endpoint (`/health`)
2. Specific sub-endpoints for each service
3. V3-specific transaction endpoints
4. Query parameter specifications
5. Authentication requirements per endpoint

## Recommendations

1. **Update api-config.ts** to include all endpoints with their full paths
2. **Add type definitions** for request/response objects
3. **Include authentication requirements** in the configuration
4. **Add query parameter specifications** where applicable
5. **Consider versioning** for the V3 transaction endpoints

## Network Support

The backend supports the following networks with their chain IDs:
- Ethereum: 1
- Sepolia: 11155111
- Arbitrum: 42161
- Arbitrum Sepolia: 421614
- Polygon: 137
- Polygon Amoy: 80002
- Optimism: 10
- Base: 8453

Non-EVM networks (basic validation only):
- Solana
- Bitcoin

## Authentication

Most endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <idToken>
```

The backend supports both ID tokens and custom tokens in test mode, but only ID tokens in production.