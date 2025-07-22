"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context-v2"
import * as transactionApi from "@/services/transaction-api"

type TransactionContextType = {
  loading: boolean
  error: string | null
  transactions: any[]
  currentTransaction: any | null
  fetchTransactions: () => Promise<void>
  fetchTransaction: (id: string) => Promise<void>
  createTransaction: (data: any) => Promise<any>
  updateConditionStatus: (
    transactionId: string,
    conditionId: string,
    newStatus: string,
    comment: string,
  ) => Promise<void>
  syncTransactionStatus: (
    transactionId: string,
    newStatus: string,
    eventMessage: string,
    finalApprovalDeadline?: string,
    disputeResolutionDeadline?: string,
  ) => Promise<void>
  startFinalApproval: (transactionId: string, finalApprovalDeadline: string) => Promise<void>
  raiseDispute: (transactionId: string, disputeResolutionDeadline: string, conditionId?: string) => Promise<void>
  getContractDeploymentStatus: (transactionId: string) => Promise<any>
  deployContract: (transactionId: string, contractParams: any) => Promise<void>
  getContractEvents: (transactionId: string) => Promise<any[]>
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined)

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const { user, authToken } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [currentTransaction, setCurrentTransaction] = useState<any | null>(null)
  const [lastFetchAttempt, setLastFetchAttempt] = useState<number>(0)

  const fetchTransactions = async () => {
    // Prevent rapid successive calls (debounce 2 seconds)
    const now = Date.now()
    if (now - lastFetchAttempt < 2000) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Skipping fetchTransactions - too recent')
      }
      return
    }
    setLastFetchAttempt(now)

    if (!user || !authToken) {
      setError("User not authenticated")
      setTransactions([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await transactionApi.getTransactions(authToken)
      setTransactions(Array.isArray(data) ? data : [])
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Transactions fetched successfully:', data?.length || 0, 'transactions')
      }
    } catch (err: any) {
      console.error('Transaction fetch error:', err)
      setError(err.message || "Failed to fetch transactions")
      setTransactions([])
      
      toast({
        title: "Error",
        description: err.message || "Failed to fetch transactions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTransaction = async (id: string) => {
    if (!user || !authToken) {
      setError("User not authenticated")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await transactionApi.getTransaction(id, authToken)
      setCurrentTransaction(data)
    } catch (err: any) {
      setError(err.message || "Failed to fetch transaction")
      toast({
        title: "Error",
        description: err.message || "Failed to fetch transaction",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createTransaction = async (data: any) => {
    if (!user || !authToken) {
      setError("User not authenticated")
      throw new Error("User not authenticated")
    }

    setLoading(true)
    setError(null)

    try {
      const result = await transactionApi.createTransaction(data, authToken)

      // Update transactions list
      await fetchTransactions()

      toast({
        title: "Success",
        description: "Transaction created successfully",
      })

      return result
    } catch (err: any) {
      setError(err.message || "Failed to create transaction")
      toast({
        title: "Error",
        description: err.message || "Failed to create transaction",
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateConditionStatus = async (
    transactionId: string,
    conditionId: string,
    newStatus: string,
    comment: string,
  ) => {
    if (!user || !authToken) {
      setError("User not authenticated")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await transactionApi.updateConditionStatus(transactionId, conditionId, newStatus, comment, authToken)

      // Refresh the current transaction
      await fetchTransaction(transactionId)

      toast({
        title: "Success",
        description: "Condition status updated successfully",
      })
    } catch (err: any) {
      setError(err.message || "Failed to update condition status")
      toast({
        title: "Error",
        description: err.message || "Failed to update condition status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const syncTransactionStatus = async (
    transactionId: string,
    newStatus: string,
    eventMessage: string,
    finalApprovalDeadline?: string,
    disputeResolutionDeadline?: string,
  ) => {
    if (!user) {
      setError("User not authenticated")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      await transactionApi.syncTransactionStatus(
        transactionId,
        newStatus,
        eventMessage,
        token,
        finalApprovalDeadline,
        disputeResolutionDeadline,
      )

      // Refresh the current transaction
      await fetchTransaction(transactionId)

      toast({
        title: "Success",
        description: "Transaction status synced successfully",
      })
    } catch (err: any) {
      setError(err.message || "Failed to sync transaction status")
      toast({
        title: "Error",
        description: err.message || "Failed to sync transaction status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const startFinalApproval = async (transactionId: string, finalApprovalDeadline: string) => {
    if (!user || !authToken) {
      setError("User not authenticated")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await transactionApi.startFinalApproval(transactionId, finalApprovalDeadline, authToken)

      // Refresh the current transaction
      await fetchTransaction(transactionId)

      toast({
        title: "Success",
        description: "Final approval period started successfully",
      })
    } catch (err: any) {
      setError(err.message || "Failed to start final approval period")
      toast({
        title: "Error",
        description: err.message || "Failed to start final approval period",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const raiseDispute = async (transactionId: string, disputeResolutionDeadline: string, conditionId?: string) => {
    if (!user || !authToken) {
      setError("User not authenticated")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await transactionApi.raiseDispute(transactionId, disputeResolutionDeadline, authToken, conditionId)

      // Refresh the current transaction
      await fetchTransaction(transactionId)

      toast({
        title: "Success",
        description: "Dispute raised successfully",
      })
    } catch (err: any) {
      setError(err.message || "Failed to raise dispute")
      toast({
        title: "Error",
        description: err.message || "Failed to raise dispute",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getContractDeploymentStatus = async (transactionId: string) => {
    if (!user || !authToken) {
      throw new Error("User not authenticated")
    }

    try {
      return await transactionApi.getContractDeploymentStatus(transactionId, authToken)
    } catch (err: any) {
      console.error("Failed to get contract deployment status:", err)
      throw err
    }
  }

  const deployContract = async (transactionId: string, contractParams: any) => {
    if (!user || !authToken) {
      throw new Error("User not authenticated")
    }

    try {
      await transactionApi.deployContract(transactionId, contractParams, authToken)
      toast({
        title: "Success",
        description: "Contract deployment initiated",
      })
    } catch (err: any) {
      console.error("Failed to deploy contract:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to deploy contract",
        variant: "destructive",
      })
      throw err
    }
  }

  const getContractEvents = async (transactionId: string) => {
    if (!user || !authToken) {
      throw new Error("User not authenticated")
    }

    try {
      return await transactionApi.getContractEvents(transactionId, authToken)
    } catch (err: any) {
      console.error("Failed to get contract events:", err)
      throw err
    }
  }

  return (
    <TransactionContext.Provider
      value={{
        loading,
        error,
        transactions,
        currentTransaction,
        fetchTransactions,
        fetchTransaction,
        createTransaction,
        updateConditionStatus,
        syncTransactionStatus,
        startFinalApproval,
        raiseDispute,
        getContractDeploymentStatus,
        deployContract,
        getContractEvents,
      }}
    >
      {children}
    </TransactionContext.Provider>
  )
}

export function useTransaction() {
  const context = useContext(TransactionContext)
  if (context === undefined) {
    throw new Error("useTransaction must be used within a TransactionProvider")
  }
  return context
}
