"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Contract,
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  RefreshCw,
  Play,
  Shield
} from "lucide-react"
import { useTransaction } from "@/context/transaction-context"
import { useToast } from "@/components/ui/use-toast"

interface SmartContractStatusProps {
  transactionId: string
  onContractDeploy?: () => void
}

interface ContractStatus {
  isDeployed: boolean
  contractAddress?: string
  deploymentTx?: string
  status: 'pending' | 'deploying' | 'deployed' | 'failed'
  blockNumber?: number
  gasUsed?: string
  deployedAt?: string
}

export default function SmartContractStatus({ 
  transactionId, 
  onContractDeploy 
}: SmartContractStatusProps) {
  const { getContractDeploymentStatus, deployContract, getContractEvents } = useTransaction()
  const { toast } = useToast()
  const [contractStatus, setContractStatus] = useState<ContractStatus | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContractStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const status = await getContractDeploymentStatus(transactionId)
      setContractStatus(status)

      // If contract is deployed, fetch events
      if (status.isDeployed) {
        const contractEvents = await getContractEvents(transactionId)
        setEvents(contractEvents)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contract status')
    } finally {
      setLoading(false)
    }
  }

  const handleDeployContract = async () => {
    try {
      setDeploying(true)
      setError(null)

      // Default contract parameters - in real implementation, these would come from transaction data
      const contractParams = {
        buyerAddress: "0x...", // Would be filled from transaction
        sellerAddress: "0x...", // Would be filled from transaction  
        escrowAmount: "1000000000000000000", // Would be filled from transaction
        conditions: [], // Would be filled from transaction conditions
      }

      await deployContract(transactionId, contractParams)
      await fetchContractStatus() // Refresh status
      onContractDeploy?.()

      toast({
        title: "Contract Deployed",
        description: "Smart contract has been deployed successfully",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy contract')
      toast({
        title: "Deployment Failed",
        description: err instanceof Error ? err.message : 'Failed to deploy contract',
        variant: "destructive",
      })
    } finally {
      setDeploying(false)
    }
  }

  useEffect(() => {
    fetchContractStatus()
  }, [transactionId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'deploying':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <CheckCircle className="h-4 w-4" />
      case 'deploying':
        return <Clock className="h-4 w-4" />
      case 'failed':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Contract className="h-4 w-4" />
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchContractStatus}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Smart Contract</CardTitle>
          <CardDescription>
            Blockchain contract status and deployment tracking
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchContractStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {contractStatus && !contractStatus.isDeployed && (
            <Button
              size="sm"
              onClick={handleDeployContract}
              disabled={deploying}
              className="bg-teal-700 hover:bg-teal-800"
            >
              {deploying ? (
                <>
                  <Clock className="h-4 w-4 mr-1 animate-pulse" />
                  Deploying...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Deploy Contract
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading && !contractStatus ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
          </div>
        ) : contractStatus ? (
          <div className="space-y-4">
            {/* Contract Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Contract className="h-5 w-5 text-teal-700" />
                <span className="font-medium">Status</span>
              </div>
              <Badge className={getStatusColor(contractStatus.status)}>
                {getStatusIcon(contractStatus.status)}
                <span className="ml-1 capitalize">{contractStatus.status}</span>
              </Badge>
            </div>

            {/* Contract Details */}
            {contractStatus.isDeployed && (
              <>
                <div className="grid grid-cols-1 gap-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Contract Address</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {contractStatus.contractAddress?.slice(0, 10)}...{contractStatus.contractAddress?.slice(-8)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://etherscan.io/address/${contractStatus.contractAddress}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {contractStatus.blockNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Block Number</span>
                      <span className="text-sm font-mono">{contractStatus.blockNumber}</span>
                    </div>
                  )}

                  {contractStatus.gasUsed && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Gas Used</span>
                      <span className="text-sm font-mono">{contractStatus.gasUsed}</span>
                    </div>
                  )}

                  {contractStatus.deployedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Deployed At</span>
                      <span className="text-sm">{new Date(contractStatus.deployedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Contract Events */}
                {events.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Recent Contract Events
                    </h4>
                    <div className="space-y-2">
                      {events.slice(0, 3).map((event, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="font-mono text-teal-700">{event.event}</span>
                          <span className="text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                      {events.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          +{events.length - 3} more events
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Contract className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No contract deployment information available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}