"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Clock, 
  Check, 
  X, 
  Mail, 
  User, 
  Loader2,
  Inbox
} from "lucide-react"
import { useContacts } from "@/context/contact-context"
import { ContactInvitation } from "@/services/contacts-api"

export default function PendingInvitations() {
  const { pendingInvitations, acceptInvitation, rejectInvitation, loading } = useContacts()
  const [processingInvitations, setProcessingInvitations] = useState<Set<string>>(new Set())

  const handleAccept = async (invitationId: string) => {
    try {
      setProcessingInvitations(prev => new Set(prev).add(invitationId))
      await acceptInvitation(invitationId)
    } catch (err) {
      console.error("Error accepting invitation:", err)
    } finally {
      setProcessingInvitations(prev => {
        const next = new Set(prev)
        next.delete(invitationId)
        return next
      })
    }
  }

  const handleReject = async (invitationId: string) => {
    try {
      setProcessingInvitations(prev => new Set(prev).add(invitationId))
      await rejectInvitation(invitationId)
    } catch (err) {
      console.error("Error rejecting invitation:", err)
    } finally {
      setProcessingInvitations(prev => {
        const next = new Set(prev)
        next.delete(invitationId)
        return next
      })
    }
  }

  const getInitials = (firstName: string, lastName?: string) => {
    return `${firstName.charAt(0)}${lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card className="bg-white shadow-soft border-0">
        <CardContent className="py-8">
          <div className="flex justify-center items-center">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (pendingInvitations.length === 0) {
    return (
      <Card className="bg-white shadow-soft border-0">
        <CardContent className="text-center py-8">
          <Inbox className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Invitations</h3>
          <p className="text-gray-500">
            You don't have any pending contact invitations at the moment.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-600" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          Respond to contact invitations from other users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingInvitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
            >
              <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-teal-100 text-teal-700">
                    {getInitials(invitation.senderFirstName, invitation.senderLastName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {invitation.senderFirstName} {invitation.senderLastName || ''}
                    </p>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {invitation.senderEmail}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(invitation.createdAt)}
                    </div>
                  </div>
                  
                  {invitation.senderWallets && invitation.senderWallets.length > 0 && (
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs">
                        {invitation.senderWallets.length} wallet{invitation.senderWallets.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 sm:ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(invitation.id)}
                  disabled={processingInvitations.has(invitation.id)}
                  className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50"
                >
                  {processingInvitations.has(invitation.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Decline</span>
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  onClick={() => handleAccept(invitation.id)}
                  disabled={processingInvitations.has(invitation.id)}
                  className="flex-1 sm:flex-none bg-teal-700 hover:bg-teal-800"
                >
                  {processingInvitations.has(invitation.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Accept</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}