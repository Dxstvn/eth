"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Wallet,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Lock,
  Unlock
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTransaction } from "@/context/transaction-context"
import { useToast } from "@/components/ui/use-toast"

interface EscrowReleaseProps {
  transactionId: string
  escrowAmount: string
  currency: string
  escrowStatus: 'locked' | 'pending_release' | 'released' | 'disputed'
  canRelease?: boolean
  finalApprovalDeadline?: string
  contractAddress?: string
  recipientAddress?: string
}

export default function EscrowRelease({
  transactionId,
  escrowAmount,
  currency,
  escrowStatus,
  canRelease = false,
  finalApprovalDeadline,
  contractAddress,
  recipientAddress,
}: EscrowReleaseProps) {
  const { releaseEscrow, startFinalApproval } = useTransaction()
  const { toast } = useToast()
  const [showReleaseModal, setShowReleaseModal] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleReleaseEscrow = async () => {
    try {
      setLoading(true)
      await releaseEscrow(transactionId)
      setShowReleaseModal(false)
      
      toast({
        title: "Escrow Released",
        description: "Funds have been released to the recipient successfully",
      })
    } catch (error) {
      console.error('Failed to release escrow:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartFinalApproval = async () => {
    try {
      setLoading(true)
      
      // Set final approval deadline (default 7 days)
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + 7)
      
      await startFinalApproval(transactionId, deadline.toISOString())
      setShowApprovalModal(false)
      
      toast({
        title: "Final Approval Started",
        description: "Final approval period has been initiated",
      })
    } catch (error) {
      console.error('Failed to start final approval:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'locked':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pending_release':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'released':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'disputed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'locked':
        return <Lock className="h-4 w-4" />
      case 'pending_release':
        return <Clock className="h-4 w-4" />
      case 'released':
        return <CheckCircle className="h-4 w-4" />
      case 'disputed':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Wallet className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'locked':
        return 'Funds Locked'
      case 'pending_release':
        return 'Pending Release'
      case 'released':
        return 'Funds Released'
      case 'disputed':
        return 'Under Dispute'
      default:
        return 'Unknown Status'
    }
  }

  const isDeadlineApproaching = () => {
    if (!finalApprovalDeadline) return false
    const deadline = new Date(finalApprovalDeadline)
    const now = new Date()
    const timeDiff = deadline.getTime() - now.getTime()
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))
    return daysRemaining <= 3 && daysRemaining > 0
  }

  const isDeadlinePassed = () => {
    if (!finalApprovalDeadline) return false
    return new Date(finalApprovalDeadline) < new Date()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Escrow Release
          </CardTitle>
          <CardDescription>
            Manage the release of escrowed funds for this transaction
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Escrow Amount */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-teal-700" />
              <span className="font-medium">Escrow Amount</span>
            </div>
            <span className="text-lg font-bold">
              {escrowAmount} {currency}
            </span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="font-medium">Status</span>
            <Badge className={getStatusColor(escrowStatus)}>
              {getStatusIcon(escrowStatus)}
              <span className="ml-1">{getStatusText(escrowStatus)}</span>
            </Badge>
          </div>

          {/* Contract Details */}
          {contractAddress && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Contract Address</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://etherscan.io/address/${contractAddress}`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {recipientAddress && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recipient Address</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {recipientAddress.slice(0, 10)}...{recipientAddress.slice(-8)}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Final Approval Deadline */}
          {finalApprovalDeadline && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Final Approval Deadline</span>
                <span className="text-sm font-medium">
                  {new Date(finalApprovalDeadline).toLocaleDateString()}
                </span>
              </div>
              
              {isDeadlineApproaching() && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Final approval deadline is approaching. Action may be required soon.
                  </AlertDescription>
                </Alert>
              )}

              {isDeadlinePassed() && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Final approval deadline has passed. Funds may be automatically released.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {canRelease && escrowStatus === 'pending_release' && (
              <Button
                onClick={() => setShowReleaseModal(true)}
                className="bg-teal-700 hover:bg-teal-800"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Release Funds
              </Button>
            )}

            {canRelease && escrowStatus === 'locked' && (
              <Button
                variant="outline"
                onClick={() => setShowApprovalModal(true)}
                className="text-teal-700 border-teal-200 hover:bg-teal-50"
              >
                <Clock className="h-4 w-4 mr-2" />
                Start Final Approval
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Release Confirmation Modal */}
      <Dialog open={showReleaseModal} onOpenChange={setShowReleaseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Escrow Release</DialogTitle>
            <DialogDescription>
              Are you sure you want to release the escrowed funds? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription>
                <strong>{escrowAmount} {currency}</strong> will be released to the recipient's address.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReleaseModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReleaseEscrow}
              disabled={loading}
              className="bg-teal-700 hover:bg-teal-800"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-pulse" />
                  Releasing...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Release Funds
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Final Approval</DialogTitle>
            <DialogDescription>
              This will initiate the final approval period. The recipient will have 7 days to complete any final requirements.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                After the deadline, funds may be automatically released if no disputes are raised.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartFinalApproval}
              disabled={loading}
              className="bg-blue-700 hover:bg-blue-800"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-pulse" />
                  Starting...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Start Final Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}