"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  AlertTriangle,
  CheckCircle,
  X,
  Clock,
  MessageSquare,
  Shield,
  Gavel
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

interface DisputeResolutionProps {
  transactionId: string
  disputeStatus?: 'none' | 'raised' | 'in_review' | 'resolved_approve' | 'resolved_deny'
  disputeDeadline?: string
  disputeReason?: string
  canRaiseDispute?: boolean
  canResolveDispute?: boolean
}

export default function DisputeResolution({
  transactionId,
  disputeStatus = 'none',
  disputeDeadline,
  disputeReason,
  canRaiseDispute = false,
  canResolveDispute = false,
}: DisputeResolutionProps) {
  const { raiseDispute, resolveDispute } = useTransaction()
  const { toast } = useToast()
  const [showRaiseModal, setShowRaiseModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [disputeComment, setDisputeComment] = useState("")
  const [resolutionComment, setResolutionComment] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRaiseDispute = async () => {
    if (!disputeComment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a reason for raising the dispute",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      
      // Calculate deadline (30 days from now by default)
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + 30)
      
      await raiseDispute(transactionId, deadline.toISOString(), disputeComment)
      setShowRaiseModal(false)
      setDisputeComment("")
      
      toast({
        title: "Dispute Raised",
        description: "Your dispute has been submitted for review",
      })
    } catch (error) {
      console.error('Failed to raise dispute:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveDispute = async (resolution: 'approve' | 'deny') => {
    try {
      setLoading(true)
      await resolveDispute(transactionId, resolution, resolutionComment)
      setShowResolveModal(false)
      setResolutionComment("")
      
      toast({
        title: "Dispute Resolved",
        description: `Dispute has been ${resolution === 'approve' ? 'approved' : 'denied'}`,
      })
    } catch (error) {
      console.error('Failed to resolve dispute:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'raised':
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'resolved_approve':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'resolved_deny':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'raised':
      case 'in_review':
        return <AlertTriangle className="h-4 w-4" />
      case 'resolved_approve':
        return <CheckCircle className="h-4 w-4" />
      case 'resolved_deny':
        return <X className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'raised':
        return 'Dispute Raised'
      case 'in_review':
        return 'Under Review'
      case 'resolved_approve':
        return 'Resolved - Approved'
      case 'resolved_deny':
        return 'Resolved - Denied'
      default:
        return 'No Active Dispute'
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Dispute Resolution
          </CardTitle>
          <CardDescription>
            Manage transaction disputes and resolution process
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between">
            <span className="font-medium">Current Status</span>
            <Badge className={getStatusColor(disputeStatus)}>
              {getStatusIcon(disputeStatus)}
              <span className="ml-1">{getStatusText(disputeStatus)}</span>
            </Badge>
          </div>

          {/* Dispute Details */}
          {disputeStatus !== 'none' && (
            <div className="space-y-3 pt-2 border-t">
              {disputeDeadline && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Resolution Deadline</span>
                  <span className="text-sm font-medium">
                    {new Date(disputeDeadline).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {disputeReason && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Dispute Reason</span>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    {disputeReason}
                  </div>
                </div>
              )}

              {disputeStatus === 'raised' || disputeStatus === 'in_review' ? (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    This dispute is currently under review. Please allow time for resolution.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {canRaiseDispute && disputeStatus === 'none' && (
              <Button
                variant="outline"
                onClick={() => setShowRaiseModal(true)}
                className="text-red-700 border-red-200 hover:bg-red-50"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Raise Dispute
              </Button>
            )}

            {canResolveDispute && (disputeStatus === 'raised' || disputeStatus === 'in_review') && (
              <Button
                onClick={() => setShowResolveModal(true)}
                className="bg-teal-700 hover:bg-teal-800"
              >
                <Gavel className="h-4 w-4 mr-2" />
                Resolve Dispute
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Raise Dispute Modal */}
      <Dialog open={showRaiseModal} onOpenChange={setShowRaiseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Raise Dispute</DialogTitle>
            <DialogDescription>
              Describe the issue you're experiencing with this transaction.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Please explain the reason for this dispute..."
              value={disputeComment}
              onChange={(e) => setDisputeComment(e.target.value)}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRaiseModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRaiseDispute}
              disabled={loading || !disputeComment.trim()}
              className="bg-red-700 hover:bg-red-800"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-pulse" />
                  Submitting...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Raise Dispute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dispute Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Make a decision on this dispute and provide any additional comments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Optional: Add comments about your decision..."
              value={resolutionComment}
              onChange={(e) => setResolutionComment(e.target.value)}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowResolveModal(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveDispute('deny')}
                disabled={loading}
                className="text-red-700 border-red-200 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                Deny
              </Button>
              <Button
                onClick={() => handleResolveDispute('approve')}
                disabled={loading}
                className="bg-green-700 hover:bg-green-800"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}