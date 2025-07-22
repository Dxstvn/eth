"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Wallet, 
  Trash2, 
  User,
  Loader2,
  UserX
} from "lucide-react"
import { useContacts } from "@/context/contact-context"
import { Contact } from "@/services/contacts-api"

export default function ContactList() {
  const { contacts, removeContact, searchContacts, loading } = useContacts()
  const [searchQuery, setSearchQuery] = useState("")
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null)

  const filteredContacts = searchContacts(searchQuery)

  const handleDeleteContact = async (contact: Contact) => {
    try {
      setDeletingContactId(contact.id)
      await removeContact(contact.id)
      setContactToDelete(null)
    } catch (err) {
      console.error("Error deleting contact:", err)
    } finally {
      setDeletingContactId(null)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatPhone = (phone: string) => {
    // Basic phone formatting for display
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
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

  return (
    <>
      <Card className="bg-white shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            My Contacts ({contacts.length})
          </CardTitle>
          <CardDescription>
            Manage your connected contacts for transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search contacts by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Contact List */}
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              {contacts.length === 0 ? (
                <>
                  <UserX className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Contacts</h3>
                  <p className="text-gray-500">
                    Start by sending contact invitations to connect with other users.
                  </p>
                </>
              ) : (
                <>
                  <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Results</h3>
                  <p className="text-gray-500">
                    No contacts found matching "{searchQuery}". Try a different search term.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-teal-100 text-teal-700">
                        {getInitials(contact.first_name, contact.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {contact.first_name} {contact.last_name}
                        </h3>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                          Connected
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </div>
                        
                        {contact.phone_number && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhone(contact.phone_number)}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Connected on {formatDate(contact.relationshipCreatedAt)}
                        </div>
                      </div>
                      
                      {contact.wallets && contact.wallets.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <Wallet className="h-3 w-3 text-gray-400" />
                          <div className="flex gap-1 flex-wrap">
                            {contact.wallets.map((wallet, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {wallet.network || 'Unknown'}: {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 sm:ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setContactToDelete(contact)}
                      disabled={deletingContactId === contact.id}
                      className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50"
                    >
                      {deletingContactId === contact.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Remove</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!contactToDelete} onOpenChange={() => setContactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium">
                {contactToDelete?.first_name} {contactToDelete?.last_name}
              </span>{" "}
              from your contacts? This action cannot be undone and will remove the contact from both users' contact lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => contactToDelete && handleDeleteContact(contactToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Contact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}