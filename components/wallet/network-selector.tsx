"use client"

import { useState } from "react"
import { useWallet } from "@/context/wallet-context"
import { multiChainService } from "@/services/multi-chain-service"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Network, TestTube, Zap, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import type { BlockchainNetwork } from "@/types/wallet"

interface NetworkSelectorProps {
  variant?: "default" | "compact" | "detailed"
  showTestnets?: boolean
  onNetworkChange?: (network: BlockchainNetwork) => void
}

export function NetworkSelector({
  variant = "default",
  showTestnets = false,
  onNetworkChange
}: NetworkSelectorProps) {
  const { currentNetwork, switchNetwork, isConnecting } = useWallet()
  const [switching, setSwitching] = useState(false)

  const allNetworks = multiChainService.getSupportedNetworks()
  const mainnetNetworks = multiChainService.getMainnetNetworks()
  const testnetNetworks = multiChainService.getTestnetNetworks()

  const currentNetworkConfig = multiChainService.getNetworkConfig(currentNetwork || 'ethereum')

  const handleNetworkSwitch = async (network: BlockchainNetwork) => {
    if (network === currentNetwork) return

    setSwitching(true)
    try {
      await switchNetwork(network)
      onNetworkChange?.(network)
      
      const networkConfig = multiChainService.getNetworkConfig(network)
      toast.success(`Switched to ${networkConfig?.name || network}`)
    } catch (error) {
      console.error('Network switch failed:', error)
      // Error handling is done in the wallet context
    } finally {
      setSwitching(false)
    }
  }

  const getNetworkIcon = (network: string) => {
    const config = multiChainService.getNetworkConfig(network as BlockchainNetwork)
    if (config?.iconUrl) {
      return (
        <img 
          src={config.iconUrl} 
          alt={config.name}
          className="h-4 w-4 rounded-full"
          onError={(e) => {
            // Fallback to default icon if image fails to load
            e.currentTarget.style.display = 'none'
          }}
        />
      )
    }
    return <Network className="h-4 w-4" />
  }

  const getBridgeRecommendation = (targetNetwork: BlockchainNetwork) => {
    if (!currentNetwork) return null
    return multiChainService.getChainSwitchingRecommendations(currentNetwork, targetNetwork)
  }

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={switching || isConnecting}
            className="gap-2"
          >
            {getNetworkIcon(currentNetwork || 'ethereum')}
            <span className="hidden sm:inline">
              {currentNetworkConfig?.name || 'Select Network'}
            </span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Switch Network</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {mainnetNetworks.map((network) => (
            <DropdownMenuItem 
              key={network.name}
              onClick={() => handleNetworkSwitch(Object.keys(allNetworks).find(key => 
                allNetworks[key].chainId === network.chainId
              ) as BlockchainNetwork)}
              className="gap-2"
            >
              {getNetworkIcon(Object.keys(allNetworks).find(key => 
                allNetworks[key].chainId === network.chainId
              ) || 'ethereum')}
              <span>{network.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (variant === "detailed") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Network Selection</h3>
          {showTestnets && (
            <Badge variant="outline" className="gap-1">
              <TestTube className="h-3 w-3" />
              Testnets Enabled
            </Badge>
          )}
        </div>

        {/* Current Network */}
        {currentNetwork && currentNetworkConfig && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 mb-2">
              {getNetworkIcon(currentNetwork)}
              <div>
                <h4 className="font-medium">{currentNetworkConfig.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {currentNetworkConfig.symbol} • Chain ID: {currentNetworkConfig.chainId}
                </p>
              </div>
              <Badge variant="default" className="ml-auto">Current</Badge>
            </div>
            {currentNetworkConfig.blockExplorerUrls && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(currentNetworkConfig.blockExplorerUrls[0], '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-3 w-3" />
                View Explorer
              </Button>
            )}
          </div>
        )}

        {/* Mainnet Networks */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Mainnet Networks</h4>
          <div className="grid gap-2">
            {mainnetNetworks.map((network) => {
              const networkKey = Object.keys(allNetworks).find(key => 
                allNetworks[key].chainId === network.chainId
              ) as BlockchainNetwork
              
              const isCurrent = networkKey === currentNetwork
              const bridgeInfo = currentNetwork ? getBridgeRecommendation(networkKey) : null

              return (
                <div 
                  key={network.chainId}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isCurrent 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => !isCurrent && handleNetworkSwitch(networkKey)}
                >
                  <div className="flex items-center gap-3">
                    {getNetworkIcon(networkKey)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{network.name}</span>
                        {isCurrent && <Badge variant="default" size="sm">Current</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {network.symbol} • Chain ID: {network.chainId}
                      </p>
                      {bridgeInfo?.needsBridge && !isCurrent && (
                        <p className="text-xs text-orange-600 mt-1">
                          Bridge required • {bridgeInfo.estimatedTime}
                        </p>
                      )}
                    </div>
                    {!isCurrent && (
                      <Button 
                        size="sm" 
                        disabled={switching}
                        className="ml-auto"
                      >
                        {switching ? (
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Switching...
                          </div>
                        ) : (
                          'Switch'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Testnet Networks */}
        {showTestnets && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <TestTube className="h-3 w-3" />
              Testnet Networks
            </h4>
            <div className="grid gap-2">
              {testnetNetworks.map((network) => {
                const networkKey = Object.keys(allNetworks).find(key => 
                  allNetworks[key].chainId === network.chainId
                ) as BlockchainNetwork
                
                const isCurrent = networkKey === currentNetwork

                return (
                  <div 
                    key={network.chainId}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isCurrent 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'hover:border-orange-300 hover:bg-orange-50/50'
                    }`}
                    onClick={() => !isCurrent && handleNetworkSwitch(networkKey)}
                  >
                    <div className="flex items-center gap-3">
                      {getNetworkIcon(networkKey)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{network.name}</span>
                          {isCurrent && <Badge variant="secondary" size="sm">Current</Badge>}
                          <Badge variant="outline" size="sm" className="text-orange-600 border-orange-300">
                            Testnet
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {network.symbol} • Chain ID: {network.chainId}
                        </p>
                      </div>
                      {!isCurrent && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={switching}
                          className="ml-auto"
                        >
                          Switch
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          disabled={switching || isConnecting}
          className="gap-2 min-w-40"
        >
          {getNetworkIcon(currentNetwork || 'ethereum')}
          <span>{currentNetworkConfig?.name || 'Select Network'}</span>
          <ChevronDown className="h-4 w-4 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Network</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Mainnet Networks */}
        {mainnetNetworks.map((network) => {
          const networkKey = Object.keys(allNetworks).find(key => 
            allNetworks[key].chainId === network.chainId
          ) as BlockchainNetwork
          
          const isCurrent = networkKey === currentNetwork
          
          return (
            <DropdownMenuItem 
              key={network.chainId}
              onClick={() => handleNetworkSwitch(networkKey)}
              disabled={isCurrent || switching}
              className="gap-2"
            >
              {getNetworkIcon(networkKey)}
              <span className="flex-1">{network.name}</span>
              {isCurrent && <Badge variant="default" size="sm">Current</Badge>}
            </DropdownMenuItem>
          )
        })}

        {/* Testnet Networks */}
        {showTestnets && testnetNetworks.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1">
              <TestTube className="h-3 w-3" />
              Testnets
            </DropdownMenuLabel>
            {testnetNetworks.map((network) => {
              const networkKey = Object.keys(allNetworks).find(key => 
                allNetworks[key].chainId === network.chainId
              ) as BlockchainNetwork
              
              const isCurrent = networkKey === currentNetwork
              
              return (
                <DropdownMenuItem 
                  key={network.chainId}
                  onClick={() => handleNetworkSwitch(networkKey)}
                  disabled={isCurrent || switching}
                  className="gap-2"
                >
                  {getNetworkIcon(networkKey)}
                  <span className="flex-1">{network.name}</span>
                  {isCurrent && <Badge variant="secondary" size="sm">Current</Badge>}
                </DropdownMenuItem>
              )
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}