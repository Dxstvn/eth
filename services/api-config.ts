// API Configuration matching backend routes from /backend/src/api/
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.clearhold.app',
  
  endpoints: {
    // Authentication endpoints
    auth: {
      base: '/auth',
      signUp: '/auth/signUpEmailPass',
      signIn: '/auth/signInEmailPass',
      signInGoogle: '/auth/signInGoogle',
      refreshToken: '/auth/refreshToken'
    },
    
    // File management endpoints
    files: {
      base: '/files',
      upload: '/files/upload',
      myDeals: '/files/my-deals',
      download: (dealId: string, fileId: string) => `/files/download/${dealId}/${fileId}`
    },
    
    // Contact management endpoints
    contact: {
      base: '/contact',
      invite: '/contact/invite',
      pending: '/contact/pending',
      response: '/contact/response',
      list: '/contact/contacts',
      delete: (contactId: string) => `/contact/contacts/${contactId}`
    },
    
    // Transaction endpoints
    transaction: {
      base: '/transaction',
      // V3 specific endpoints
      v3Quote: '/transaction/v3/quote',
      
      // Core transaction operations
      create: '/transaction/create',
      updateCondition: '/transaction/updateCondition',
      releaseEscrow: '/transaction/releaseEscrow',
      raiseDispute: '/transaction/raiseDispute',
      resolveDispute: '/transaction/resolveDispute',
      
      // Deal information
      getDeal: (dealId: string) => `/transaction/deal/${dealId}`,
      getDealAlt: (dealId: string) => `/transaction/${dealId}`,
      list: '/transaction/transactions',
      
      // Condition management
      updateConditionStatus: (conditionId: string) => `/transaction/conditions/${conditionId}/buyer-review`,
      
      // Smart contract synchronization
      syncStatus: (dealId: string) => `/transaction/${dealId}/sync-status`,
      startFinalApproval: (dealId: string) => `/transaction/${dealId}/sc/start-final-approval`,
      raiseScDispute: (dealId: string) => `/transaction/${dealId}/sc/raise-dispute`,
      
      // Utilities
      estimateGas: '/transaction/estimate-gas',
      
      // Admin
      adminManualIntervention: '/transaction/admin/manual-intervention'
    },
    
    // Wallet management endpoints
    wallet: {
      base: '/wallet',
      register: '/wallet/register',
      list: '/wallet/',
      chains: '/wallet/chains',
      tokens: (chainId: string) => `/wallet/tokens/${chainId}`,
      setPrimary: '/wallet/primary',
      updateBalance: '/wallet/balance',
      preferences: '/wallet/preferences',
      detection: '/wallet/detection',
      delete: (address: string) => `/wallet/${address}`
    },
    
    // Health check endpoints
    health: {
      base: '/health',
      simple: '/health/simple',
      full: '/health/'
    }
  }
};

// Type definitions for request/response objects
export interface AuthSignUpRequest {
  email: string;
  password: string;
  walletAddress?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  tokenType: 'id' | 'custom';
  userId: string;
  user: {
    uid: string;
    email: string;
  };
}

export interface CreateDealRequest {
  amount: number;
  sellerEmail: string;
  productDescription: string;
  productPhotos?: string[];
  conditions: string | Array<{ text: string; status: string }>;
  sellerWalletAddress: string;
  buyerWalletAddress: string;
  isSeller: boolean;
  contractType?: string;
  productCategory?: string;
  buyerNetwork: string;
  sellerNetwork: string;
  tokenAddress?: string;
  depositToken?: string;
  targetToken?: string;
  disputeResolutionPeriodDays?: number; // 1-30, default 7
}

export interface CreateDealResponse {
  success: boolean;
  message: string;
  dealId: string;
  escrowId?: string;
  contractAddress?: string;
  fees?: any;
  isCrossChain: boolean;
  smartContractAddress?: string;
  transactionData: any;
}

export interface WalletRegistrationRequest {
  address: string;
  name: string;
  network: string;
  publicKey?: string;
  isPrimary?: boolean;
}

export interface ContactInviteRequest {
  contactEmail: string;
}

export interface FileUploadResponse {
  message: string;
  fileId: string;
  url: string;
}

// Supported networks with chain IDs
export const SUPPORTED_NETWORKS = {
  ethereum: { chainId: 1, name: 'Ethereum' },
  sepolia: { chainId: 11155111, name: 'Sepolia' },
  arbitrum: { chainId: 42161, name: 'Arbitrum' },
  'arbitrum-sepolia': { chainId: 421614, name: 'Arbitrum Sepolia' },
  polygon: { chainId: 137, name: 'Polygon' },
  'polygon-amoy': { chainId: 80002, name: 'Polygon Amoy' },
  optimism: { chainId: 10, name: 'Optimism' },
  base: { chainId: 8453, name: 'Base' }
};

// Helper function to get chain ID from network name
export function getChainId(network: string): number | null {
  const networkInfo = SUPPORTED_NETWORKS[network.toLowerCase() as keyof typeof SUPPORTED_NETWORKS];
  return networkInfo?.chainId || null;
}

// Helper function to build authenticated headers
export function getAuthHeaders(token: string): HeadersInit {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Helper function to build full URL
export function buildUrl(endpoint: string): string {
  return `${API_CONFIG.baseUrl}${endpoint}`;
}