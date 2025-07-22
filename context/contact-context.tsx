"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useAuth } from "./auth-context-v2"
import { 
  getUserContacts, 
  getPendingInvitations, 
  sendContactInvitation,
  respondToInvitation,
  deleteContact,
  searchContacts,
  Contact,
  ContactInvitation 
} from "@/services/contacts-api"
import { useToast } from "@/components/ui/use-toast"

interface ContactContextType {
  // State
  contacts: Contact[]
  pendingInvitations: ContactInvitation[]
  loading: boolean
  error: string | null
  
  // Actions
  sendInvitation: (email: string) => Promise<void>
  acceptInvitation: (invitationId: string) => Promise<void>
  rejectInvitation: (invitationId: string) => Promise<void>
  removeContact: (contactId: string) => Promise<void>
  searchContacts: (query: string) => Contact[]
  refreshContacts: () => Promise<void>
  refreshInvitations: () => Promise<void>
}

const ContactContext = createContext<ContactContextType | undefined>(undefined)

export function ContactProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<ContactInvitation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch contacts from backend
  const refreshContacts = useCallback(async () => {
    if (!isAuthenticated || !user) return

    try {
      setLoading(true)
      setError(null)
      const fetchedContacts = await getUserContacts()
      setContacts(fetchedContacts)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load contacts"
      setError(errorMessage)
      console.error("Error fetching contacts:", err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  // Fetch pending invitations
  const refreshInvitations = useCallback(async () => {
    if (!isAuthenticated || !user) return

    try {
      const invitations = await getPendingInvitations()
      setPendingInvitations(invitations)
    } catch (err) {
      console.error("Error fetching pending invitations:", err)
    }
  }, [isAuthenticated, user])

  // Send contact invitation
  const sendInvitation = useCallback(async (email: string) => {
    try {
      setError(null)
      await sendContactInvitation(email)
      
      toast({
        title: "Invitation Sent",
        description: `Contact invitation sent to ${email}`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send invitation"
      setError(errorMessage)
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [toast])

  // Accept invitation
  const acceptInvitation = useCallback(async (invitationId: string) => {
    try {
      setError(null)
      await respondToInvitation(invitationId, "accept")
      
      // Remove from pending invitations
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      
      // Refresh contacts to include the new contact
      await refreshContacts()
      
      toast({
        title: "Invitation Accepted",
        description: "Contact has been added to your contact list",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to accept invitation"
      setError(errorMessage)
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [refreshContacts, toast])

  // Reject invitation
  const rejectInvitation = useCallback(async (invitationId: string) => {
    try {
      setError(null)
      await respondToInvitation(invitationId, "deny")
      
      // Remove from pending invitations
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      
      toast({
        title: "Invitation Declined",
        description: "Contact invitation has been declined",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to decline invitation"
      setError(errorMessage)
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [toast])

  // Remove contact
  const removeContact = useCallback(async (contactId: string) => {
    try {
      setError(null)
      await deleteContact(contactId)
      
      // Remove from local state
      setContacts(prev => prev.filter(contact => contact.id !== contactId))
      
      toast({
        title: "Contact Removed",
        description: "Contact has been removed from your contact list",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to remove contact"
      setError(errorMessage)
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [toast])

  // Search contacts
  const handleSearchContacts = useCallback((query: string) => {
    return searchContacts(contacts, query)
  }, [contacts])

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshContacts()
      refreshInvitations()
    }
  }, [isAuthenticated, user, refreshContacts, refreshInvitations])

  // Auto-refresh every 30 seconds for invitations
  useEffect(() => {
    if (!isAuthenticated || !user) return

    const interval = setInterval(() => {
      refreshInvitations()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [isAuthenticated, user, refreshInvitations])

  const value: ContactContextType = {
    contacts,
    pendingInvitations,
    loading,
    error,
    sendInvitation,
    acceptInvitation,
    rejectInvitation,
    removeContact,
    searchContacts: handleSearchContacts,
    refreshContacts,
    refreshInvitations,
  }

  return <ContactContext.Provider value={value}>{children}</ContactContext.Provider>
}

export function useContacts() {
  const context = useContext(ContactContext)
  if (context === undefined) {
    throw new Error("useContacts must be used within a ContactProvider")
  }
  return context
}