import { apiClient } from '@/services/api/client'

// Use centralized API client instead of hardcoded URL

/**
 * Creates a new transaction/escrow deal
 */
export async function createTransaction(data: any, token: string) {
  try {
    const response = await apiClient.post('/deals/create', data, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  } catch (error) {
    console.error('Failed to create transaction:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to create transaction')
  }
}

/**
 * Gets all transactions for the current user
 */
export async function getTransactions(token: string) {
  try {
    // Check if token exists
    if (!token) {
      throw new Error('No authentication token provided')
    }

    const response = await apiClient.get('/deals', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    // Return empty array if no data
    return response.data || []
  } catch (error: any) {
    console.error('Failed to fetch transactions:', error)
    
    // Provide more specific error messages
    if (error.status === 401 || error.message?.includes('401')) {
      throw new Error('Authentication failed. Please sign in again.')
    }
    if (error.status === 403) {
      throw new Error('Access denied. Insufficient permissions.')
    }
    if (error.status === 404) {
      throw new Error('Transactions endpoint not found.')
    }
    if (error.status >= 500) {
      throw new Error('Server error. Please try again later.')
    }
    
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch transactions')
  }
}

/**
 * Gets a specific transaction by ID
 */
export async function getTransaction(id: string, token: string) {
  try {
    const response = await apiClient.get(`/deals/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  } catch (error) {
    console.error('Failed to fetch transaction:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch transaction')
  }
}

/**
 * Updates a condition status for a transaction
 */
export async function updateConditionStatus(
  transactionId: string,
  conditionId: string,
  newStatus: string,
  comment: string,
  token: string,
) {
  try {
    const response = await apiClient.put(
      `/deals/${transactionId}/conditions/${conditionId}/buyer-review`,
      {
        newBackendStatus: newStatus,
        reviewComment: comment,
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    return response.data
  } catch (error) {
    console.error('Failed to update condition status:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to update condition status')
  }
}

/**
 * Syncs transaction status with the blockchain
 */
export async function syncTransactionStatus(
  transactionId: string,
  newStatus: string,
  eventMessage: string,
  token: string,
  finalApprovalDeadline?: string,
  disputeResolutionDeadline?: string,
) {
  try {
    const body: any = {
      newSCStatus: newStatus,
      eventMessage,
    }

    if (finalApprovalDeadline) {
      body.finalApprovalDeadlineISO = finalApprovalDeadline
    }

    if (disputeResolutionDeadline) {
      body.disputeResolutionDeadlineISO = disputeResolutionDeadline
    }

    const response = await apiClient.put(`/deals/${transactionId}/sync-status`, body, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  } catch (error) {
    console.error('Failed to sync transaction status:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to sync transaction status')
  }
}

/**
 * Starts the final approval period for a transaction
 */
export async function startFinalApproval(transactionId: string, finalApprovalDeadline: string, token: string) {
  try {
    const response = await apiClient.post(`/deals/${transactionId}/sc/start-final-approval`, {
      finalApprovalDeadlineISO: finalApprovalDeadline,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  } catch (error) {
    console.error('Failed to start final approval period:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to start final approval period')
  }
}

/**
 * Raises a dispute for a transaction
 */
export async function raiseDispute(
  transactionId: string,
  disputeResolutionDeadline: string,
  token: string,
  conditionId?: string,
) {
  try {
    const body: any = {
      disputeResolutionDeadlineISO: disputeResolutionDeadline,
    }

    if (conditionId) {
      body.conditionId = conditionId
    }

    const response = await apiClient.post(`/deals/${transactionId}/sc/raise-dispute`, body, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  } catch (error) {
    console.error('Failed to raise dispute:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to raise dispute')
  }
}

/**
 * Resolves a dispute for a transaction
 */
export async function resolveDispute(
  transactionId: string,
  resolution: 'approve' | 'deny',
  token: string,
  comment?: string,
) {
  try {
    const response = await apiClient.post(`/deals/${transactionId}/sc/resolve-dispute`, {
      resolution,
      comment,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  } catch (error) {
    console.error('Failed to resolve dispute:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to resolve dispute')
  }
}

/**
 * Releases escrow funds for a transaction
 */
export async function releaseEscrow(
  transactionId: string,
  token: string,
) {
  try {
    const response = await apiClient.post(`/deals/${transactionId}/sc/release-escrow`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  } catch (error) {
    console.error('Failed to release escrow:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to release escrow')
  }
}

/**
 * Gets contract deployment status for a transaction
 */
export async function getContractDeploymentStatus(
  transactionId: string,
  token: string,
) {
  try {
    const response = await apiClient.get(`/deals/${transactionId}/contract/status`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  } catch (error) {
    console.error('Failed to get contract deployment status:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to get contract deployment status')
  }
}

/**
 * Deploys smart contract for a transaction
 */
export async function deployContract(
  transactionId: string,
  contractParams: any,
  token: string,
) {
  try {
    const response = await apiClient.post(`/deals/${transactionId}/contract/deploy`, contractParams, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  } catch (error) {
    console.error('Failed to deploy contract:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to deploy contract')
  }
}

/**
 * Gets contract events for a transaction
 */
export async function getContractEvents(
  transactionId: string,
  token: string,
  eventType?: string,
) {
  try {
    const params = eventType ? { eventType } : {}
    const response = await apiClient.get(`/deals/${transactionId}/contract/events`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    })
    return response.data
  } catch (error) {
    console.error('Failed to get contract events:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to get contract events')
  }
}
