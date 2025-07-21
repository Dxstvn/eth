"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/context/wallet-context"
import { multiChainService, type BalanceInfo } from "@/services/multi-chain-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Wallet,
  Copy,
  CheckCircle
} from "lucide-react"
import { toast } from "sonner"
import type { ConnectedWallet } from "@/types/wallet"

interface WalletBalanceCardProps {
  wallet: ConnectedWallet
  showActions?: boolean
  compact?: boolean
}

export function WalletBalanceCard({ 
  wallet, 
  showActions = true, 
  compact = false 
}: WalletBalanceCardProps) {
  const { formatBalance } = useWallet()
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hideBalance, setHideBalance] = useState(false)
  const [copied, setCopied] = useState(false)

  const networkConfig = multiChainService.getNetworkConfig(wallet.network)

  useEffect(() => {
    loadBalance()
  }, [wallet.address, wallet.network])

  const loadBalance = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    
    try {
      const balance = await multiChainService.getBalance(wallet, forceRefresh)
      setBalanceInfo(balance)
    } catch (error) {
      console.error('Error loading balance:', error)
      toast.error('Failed to load balance')
    } finally {
      setLoading(false)
      if (forceRefresh) setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadBalance(true)
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address)
      setCopied(true)
      toast.success('Address copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy address')
    }
  }

  const openExplorer = () => {
    if (!networkConfig?.blockExplorerUrls?.[0]) return
    
    const explorerUrl = `${networkConfig.blockExplorerUrls[0]}/address/${wallet.address}`
    window.open(explorerUrl, '_blank')
  }

  const formatAddress = (address: string, short = true) => {
    if (!short) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg">
        <div className="flex items-center gap-2">
          {networkConfig?.iconUrl ? (
            <img 
              src={networkConfig.iconUrl} 
              alt={networkConfig.name}
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <Wallet className="h-6 w-6" />
          )}
          <div>
            <p className="font-medium">{wallet.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatAddress(wallet.address)}
            </p>
          </div>
        </div>
        
        <div className="ml-auto text-right">
          {loading ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <>
              <p className="font-medium">
                {hideBalance ? '••••••' : formatBalance(balanceInfo?.nativeBalance || '0')}
              </p>
              <p className="text-xs text-muted-foreground">
                {balanceInfo?.nativeSymbol || networkConfig?.symbol}
              </p>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHideBalance(!hideBalance)}
        >
          {hideBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {networkConfig?.iconUrl ? (
              <img 
                src={networkConfig.iconUrl} 
                alt={networkConfig.name}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <Wallet className="h-8 w-8" />
            )}
            <div>
              <CardTitle className="text-lg">{wallet.name}</CardTitle>
              <CardDescription>
                {networkConfig?.name || wallet.network} • {formatAddress(wallet.address)}
              </CardDescription>
            </div>
          </div>
          
          {wallet.isPrimary && (
            <Badge variant="default">Primary</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Balance</p>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {hideBalance ? '••••••' : formatBalance(balanceInfo?.nativeBalance || '0')}
                </p>
                <span className="text-lg text-muted-foreground">
                  {balanceInfo?.nativeSymbol || networkConfig?.symbol}
                </span>
              </div>
            )}
            {balanceInfo?.lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(balanceInfo.lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHideBalance(!hideBalance)}
            >
              {hideBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Token Balances (if available) */}
        {balanceInfo?.tokens && balanceInfo.tokens.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Token Balances</p>
            <div className="space-y-1">
              {balanceInfo.tokens.map((token, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {token.logoUri && (
                      <img 
                        src={token.logoUri} 
                        alt={token.symbol}
                        className="h-4 w-4 rounded-full"
                      />
                    )}
                    <span>{token.symbol}</span>
                  </div>
                  <span>{formatBalance(token.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyAddress}
              className="flex-1 gap-2"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? 'Copied!' : 'Copy Address'}
            </Button>
            
            {networkConfig?.blockExplorerUrls?.[0] && (
              <Button
                variant="outline"
                size="sm"
                onClick={openExplorer}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Explorer
              </Button>
            )}
          </div>
        )}

        {/* Network Info */}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Network:</span>
            <span>{networkConfig?.name || wallet.network}</span>
          </div>
          <div className="flex justify-between">
            <span>Chain ID:</span>
            <span>{networkConfig?.chainId}</span>
          </div>
          {networkConfig?.isTestnet && (
            <div className="flex justify-between">
              <span>Type:</span>
              <Badge variant="outline" size="sm" className="text-orange-600">
                Testnet
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}