"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/context/wallet-context"
import { multiChainService, type Transaction } from "@/services/multi-chain-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ExternalLink, 
  RefreshCw,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  FileContract
} from "lucide-react"
import { toast } from "sonner"
import type { ConnectedWallet } from "@/types/wallet"

interface TransactionHistoryProps {
  wallet: ConnectedWallet
  limit?: number
  showPagination?: boolean
}

export function TransactionHistory({ 
  wallet, 
  limit = 10, 
  showPagination = true 
}: TransactionHistoryProps) {
  const { formatBalance } = useWallet()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const networkConfig = multiChainService.getNetworkConfig(wallet.network)

  useEffect(() => {
    loadTransactions()
  }, [wallet.address, wallet.network])

  const loadTransactions = async (forceRefresh = false, newOffset = 0) => {
    if (forceRefresh) setRefreshing(true)
    
    try {
      const txs = await multiChainService.getTransactionHistory(wallet, {
        limit,
        offset: newOffset,
        forceRefresh
      })
      
      if (newOffset === 0) {
        setTransactions(txs)
      } else {
        setTransactions(prev => [...prev, ...txs])
      }
      
      setHasMore(txs.length === limit)
      setOffset(newOffset)
    } catch (error) {
      console.error('Error loading transactions:', error)
      toast.error('Failed to load transaction history')
    } finally {
      setLoading(false)
      if (forceRefresh) setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadTransactions(true, 0)
  }

  const loadMore = () => {
    loadTransactions(false, offset + limit)
  }

  const openTransaction = (hash: string) => {
    if (!networkConfig?.blockExplorerUrls?.[0]) return
    
    const explorerUrl = `${networkConfig.blockExplorerUrls[0]}/tx/${hash}`
    window.open(explorerUrl, '_blank')
  }

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'sent':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />
      case 'received':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />
      case 'contract':
        return <FileContract className="h-4 w-4 text-blue-600" />
      default:
        return <ArrowUpRight className="h-4 w-4" />
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (days > 0) {
      return `${days}d ago`
    } else if (hours > 0) {
      return `${hours}h ago`
    } else if (minutes > 0) {
      return `${minutes}m ago`
    } else {
      return 'Just now'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Recent transactions for {wallet.name} on {networkConfig?.name || wallet.network}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileContract className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions found</p>
            <p className="text-sm">Transactions will appear here once you start using this wallet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div 
                key={tx.hash}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => openTransaction(tx.hash)}
              >
                <div className="flex items-center gap-2">
                  {getTypeIcon(tx.type)}
                  {getStatusIcon(tx.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium capitalize">
                      {tx.type === 'sent' ? 'Sent' : tx.type === 'received' ? 'Received' : 'Contract'}
                    </p>
                    <Badge 
                      variant={tx.status === 'success' ? 'default' : tx.status === 'failed' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {tx.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {tx.type === 'sent' ? 'To' : 'From'}: {formatAddress(tx.type === 'sent' ? tx.to : tx.from)}
                    </span>
                    <span>•</span>
                    <span>{formatTimestamp(tx.timestamp)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-medium ${tx.type === 'sent' ? 'text-red-600' : 'text-green-600'}`}>
                    {tx.type === 'sent' ? '-' : '+'}{formatBalance(tx.value)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tx.tokenSymbol || networkConfig?.symbol}
                  </p>
                </div>

                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}

            {showPagination && hasMore && (
              <div className="pt-4 text-center">
                <Button 
                  variant="outline" 
                  onClick={loadMore}
                  disabled={loading}
                  className="gap-2"
                >
                  <ChevronDown className="h-4 w-4" />
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}